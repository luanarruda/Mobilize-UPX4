// Cria as tabelas e popula com os dados de demonstração.
// Roda sozinho quando o arquivo do banco ainda não existe; para recomeçar do
// zero, use `npm run db:reset` (apaga o arquivo e recria).
import { readFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { LINHAS, PONTOS, type ChavePonto } from './dados-sorocaba.js';
import { distanciasAcumuladas, type Coord } from '../geo.js';

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const paraHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function popularBanco(banco: DatabaseSync) {
  const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

  // Transação: ou tudo entra no banco, ou nada (evita banco "pela metade").
  // Também deixa a carga muito mais rápida: o SQLite grava no disco uma vez só.
  banco.exec('BEGIN');
  try {
    banco.exec(schema);

    const inserirPonto = banco.prepare(
      'INSERT INTO pontos (nome, lat, lng, acessivel, coberto) VALUES (?, ?, ?, ?, ?)',
    );
    const idPonto = new Map<ChavePonto, number>();
    for (const [chave, p] of Object.entries(PONTOS) as [ChavePonto, (typeof PONTOS)[ChavePonto]][]) {
      const r = inserirPonto.run(p.nome, p.lat, p.lng, Number(p.acessivel), Number(p.coberto));
      idPonto.set(chave, Number(r.lastInsertRowid));
    }

    const inserirLinha = banco.prepare(
      'INSERT INTO linhas (codigo, nome, cor, empresa, trajeto) VALUES (?, ?, ?, ?, ?)',
    );
    const inserirLp = banco.prepare(
      'INSERT INTO linha_pontos (linha_id, ordem, ponto_id, sentido, distancia_m) VALUES (?, ?, ?, ?, ?)',
    );
    const inserirHorario = banco.prepare(
      'INSERT INTO horarios (linha_id, tipo_dia, saida) VALUES (?, ?, ?)',
    );
    const inserirVeiculo = banco.prepare(
      'INSERT INTO veiculos (prefixo, linha_id, acessivel) VALUES (?, ?, ?)',
    );

    let prefixo = 1001;
    for (const linha of LINHAS) {
      // Trajeto circular: ida (A→B→C) + volta (C→B→A). O último ponto da volta
      // é o próprio início, então o trajeto fecha em si mesmo.
      const ida = linha.paradas;
      const volta = [...ida].reverse().slice(1);
      const sequencia = [...ida, ...volta];
      const trajeto: Coord[] = sequencia.map((k) => [PONTOS[k].lat, PONTOS[k].lng]);
      const acc = distanciasAcumuladas(trajeto);

      const linhaId = Number(
        inserirLinha.run(linha.codigo, linha.nome, linha.cor, linha.empresa, JSON.stringify(trajeto))
          .lastInsertRowid,
      );

      // Pontos do itinerário (o último vértice repete o terminal inicial; ignoramos).
      for (let i = 0; i < sequencia.length - 1; i++) {
        inserirLp.run(linhaId, i + 1, idPonto.get(sequencia[i])!, i < ida.length ? 'ida' : 'volta', acc[i]);
      }

      // Horários: das 05:00 às 23:30 com o intervalo de cada tipo de dia.
      const tipos = ['util', 'sabado', 'domingo'] as const;
      tipos.forEach((tipo, t) => {
        for (let m = minutos('05:00'); m <= minutos('23:30'); m += linha.intervalos[t]) {
          inserirHorario.run(linhaId, tipo, paraHora(m));
        }
      });

      // Veículos: o último de cada linha sem acessibilidade, para demonstrar o RF07.
      for (let v = 0; v < linha.veiculos; v++) {
        inserirVeiculo.run(String(prefixo++), linhaId, Number(v < linha.veiculos - 1));
      }
    }
    banco.exec('COMMIT');
  } catch (erro) {
    banco.exec('ROLLBACK');
    throw erro;
  }
}
