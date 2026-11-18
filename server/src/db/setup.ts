// Cria as tabelas e popula com os dados de demonstração.
// Uso: npm run db:setup   (APAGA e recria tudo — só para desenvolvimento)
import { readFile } from 'node:fs/promises';
import { pool } from './pool.js';
import { LINHAS, PONTOS, type ChavePonto } from './dados-sorocaba.js';
import { distanciasAcumuladas, type Coord } from '../geo.js';

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const paraHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

async function main() {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  const cliente = await pool.connect();
  try {
    // Transação: ou tudo entra no banco, ou nada (evita banco "pela metade").
    await cliente.query('BEGIN');
    await cliente.query(schema);

    const idPonto = new Map<ChavePonto, number>();
    for (const [chave, p] of Object.entries(PONTOS) as [ChavePonto, (typeof PONTOS)[ChavePonto]][]) {
      const { rows } = await cliente.query(
        'INSERT INTO pontos (nome, lat, lng, acessivel, coberto) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [p.nome, p.lat, p.lng, p.acessivel, p.coberto],
      );
      idPonto.set(chave, rows[0].id);
    }

    let prefixo = 1001;
    for (const linha of LINHAS) {
      // Trajeto circular: ida (A→B→C) + volta (C→B→A). O último ponto da volta
      // é o próprio início, então o trajeto fecha em si mesmo.
      const ida = linha.paradas;
      const volta = [...ida].reverse().slice(1);
      const sequencia = [...ida, ...volta];
      const trajeto: Coord[] = sequencia.map((k) => [PONTOS[k].lat, PONTOS[k].lng]);
      const acc = distanciasAcumuladas(trajeto);

      const { rows } = await cliente.query(
        'INSERT INTO linhas (codigo, nome, cor, empresa, trajeto) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [linha.codigo, linha.nome, linha.cor, linha.empresa, JSON.stringify(trajeto)],
      );
      const linhaId: number = rows[0].id;

      // Pontos do itinerário (o último vértice repete o terminal inicial; ignoramos).
      for (let i = 0; i < sequencia.length - 1; i++) {
        await cliente.query(
          'INSERT INTO linha_pontos (linha_id, ordem, ponto_id, sentido, distancia_m) VALUES ($1,$2,$3,$4,$5)',
          [linhaId, i + 1, idPonto.get(sequencia[i]), i < ida.length ? 'ida' : 'volta', acc[i]],
        );
      }

      // Horários: das 05:00 às 23:30 com o intervalo de cada tipo de dia.
      const tipos = ['util', 'sabado', 'domingo'] as const;
      for (let t = 0; t < tipos.length; t++) {
        for (let m = minutos('05:00'); m <= minutos('23:30'); m += linha.intervalos[t]) {
          await cliente.query('INSERT INTO horarios (linha_id, tipo_dia, saida) VALUES ($1,$2,$3)', [
            linhaId, tipos[t], paraHora(m),
          ]);
        }
      }

      // Veículos: o último de cada linha sem acessibilidade, para demonstrar o RF07.
      for (let v = 0; v < linha.veiculos; v++) {
        await cliente.query('INSERT INTO veiculos (prefixo, linha_id, acessivel) VALUES ($1,$2,$3)', [
          String(prefixo++), linhaId, v < linha.veiculos - 1,
        ]);
      }
    }

    await cliente.query('COMMIT');
    console.log(`Banco pronto: ${LINHAS.length} linhas, ${Object.keys(PONTOS).length} pontos.`);
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
