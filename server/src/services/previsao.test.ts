import { describe, expect, it } from 'vitest';
import { aFrente, estimarSegundos, preverChegadas, velocidadeOperacionalKmh, PARAMETROS } from './previsao.js';
import { distanciaM, distanciasAcumuladas, pontoNaDistancia } from '../geo.js';
import type { LinhaCatalogo } from './catalogo.js';
import type { PosicaoVeiculo } from '../realtime/tipos.js';

// Linha de teste: circuito de 10 km, pontos a 0, 2.000, 5.000 (fim da ida) e 8.000 m.
const linha: LinhaCatalogo = {
  id: 1, codigo: 'T1', nome: 'Teste', cor: '#000', empresa: null, trajeto: [], totalM: 10_000,
  paradas: [
    { ordem: 1, pontoId: 10, sentido: 'ida', distanciaM: 0 },
    { ordem: 2, pontoId: 20, sentido: 'ida', distanciaM: 2_000 },
    { ordem: 3, pontoId: 30, sentido: 'ida', distanciaM: 5_000 },
    { ordem: 4, pontoId: 20, sentido: 'volta', distanciaM: 8_000 },
  ],
};

const onibus = (veiculoId: number, distanciaNoTrajeto: number, velocidadeKmh = 36): PosicaoVeiculo => ({
  veiculoId, prefixo: String(veiculoId), linhaId: 1, lat: 0, lng: 0, rumo: 0,
  velocidadeKmh, acessivel: true, distanciaNoTrajeto, atualizadoEm: '',
});

describe('geo', () => {
  it('calcula distância de ~111 km para 1 grau de latitude', () => {
    expect(distanciaM([0, 0], [1, 0])).toBeCloseTo(111_195, -2);
  });

  it('interpola a posição no meio de um trecho', () => {
    const trajeto: [number, number][] = [[0, 0], [0, 1], [0, 2]];
    const acc = distanciasAcumuladas(trajeto);
    const [lat, lng] = pontoNaDistancia(trajeto, acc, acc[1] / 2);
    expect(lat).toBeCloseTo(0);
    expect(lng).toBeCloseTo(0.5);
  });
});

describe('previsão de chegada (RF02)', () => {
  it('mede a distância para frente no circuito, dando a volta no fim', () => {
    expect(aFrente(1_000, 2_000, 10_000)).toBe(1_000);
    expect(aFrente(9_000, 2_000, 10_000)).toBe(3_000); // passa pelo terminal e segue
  });

  it('soma o tempo das paradas intermediárias', () => {
    // De 0 até 5.000 m a 36 km/h (10 m/s) = 500 s, passando pelo ponto de 2.000 m.
    expect(estimarSegundos(linha, 0, 5_000, 36)).toBe(500 + PARAMETROS.paradaMediaS);
  });

  it('informa "chegando" (0 s) quando o ônibus está a poucos metros', () => {
    expect(estimarSegundos(linha, 1_970, 30, 36)).toBe(0);
  });

  it('usa a média dos ônibus andando, ignorando os parados', () => {
    expect(velocidadeOperacionalKmh([onibus(1, 0, 20), onibus(2, 0, 30), onibus(3, 0, 0)])).toBe(25);
    expect(velocidadeOperacionalKmh([])).toBe(PARAMETROS.velocidadePadraoKmh);
  });

  it('separa as previsões de ida e de volta de um mesmo ponto e ordena pela mais próxima', () => {
    const prev = preverChegadas(linha, 20, [onibus(1, 1_000), onibus(2, 7_000)]);
    const ida = prev.filter((p) => p.sentido === 'ida');
    const volta = prev.filter((p) => p.sentido === 'volta');

    expect(ida[0].veiculoId).toBe(1);   // a 1.000 m do ponto (ida)
    expect(volta[0].veiculoId).toBe(2); // a 1.000 m do ponto (volta)
    expect(prev.map((p) => p.segundos)).toEqual([...prev.map((p) => p.segundos)].sort((a, b) => a - b));
  });
});
