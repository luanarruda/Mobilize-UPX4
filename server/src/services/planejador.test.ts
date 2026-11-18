import { describe, expect, it } from 'vitest';
import { planejar } from './planejador.js';
import type { LinhaCatalogo, PontoCatalogo } from './catalogo.js';
import type { PosicaoVeiculo } from '../realtime/tipos.js';
import type { Coord } from '../geo.js';

// Rede de teste em "L": a linha A vai de 1 a 2 (leste), a linha B vai de 2 a 3 (norte).
// Do ponto 1 ao 3 só se chega com baldeação no ponto 2.
// 0,01° de longitude no equador ≈ 1,1 km.
const ponto = (id: number, lat: number, lng: number, acessivel = true): PontoCatalogo =>
  ({ id, nome: `P${id}`, lat, lng, acessivel, coberto: false });

const pontos = [ponto(1, 0, 0), ponto(2, 0, 0.02), ponto(3, 0.02, 0.02), ponto(4, 0.0005, 0.0005)];

function linhaReta(id: number, de: PontoCatalogo, para: PontoCatalogo): LinhaCatalogo {
  const trajeto: Coord[] = [[de.lat, de.lng], [para.lat, para.lng], [de.lat, de.lng]];
  const metade = Math.hypot(para.lat - de.lat, para.lng - de.lng) * 111_195;
  return {
    id, codigo: `L${id}`, nome: `Linha ${id}`, cor: '#000', empresa: null, trajeto, totalM: metade * 2,
    paradas: [
      { ordem: 1, pontoId: de.id, sentido: 'ida', distanciaM: 0 },
      { ordem: 2, pontoId: para.id, sentido: 'volta', distanciaM: metade },
    ],
  };
}

const linhaA = linhaReta(1, pontos[0], pontos[1]);
const linhaB = linhaReta(2, pontos[1], pontos[2]);

const onibus = (linhaId: number, distancia: number, acessivel = true): PosicaoVeiculo => ({
  veiculoId: linhaId * 10 + distancia, prefixo: `${linhaId}-${distancia}`, linhaId, lat: 0, lng: 0, rumo: 0,
  velocidadeKmh: 30, acessivel, distanciaNoTrajeto: distancia, atualizadoEm: '',
});

describe('planejador de trajetos (RF04)', () => {
  const rede = { linhas: [linhaA, linhaB], pontos };

  it('encontra uma viagem direta', () => {
    const [it1] = planejar(rede, [onibus(1, 0)], 1, 2);
    expect(it1.baldeacoes).toBe(0);
    expect(it1.trechos).toHaveLength(1);
    expect(it1.trechos[0]).toMatchObject({ tipo: 'onibus', linhaId: 1, embarqueId: 1, desembarqueId: 2 });
  });

  it('faz baldeação quando não há linha direta', () => {
    const [it1] = planejar(rede, [onibus(1, 0), onibus(2, 0)], 1, 3);
    expect(it1.baldeacoes).toBe(1);
    expect(it1.trechos.map((t) => t.tipo === 'onibus' && t.linhaId)).toEqual([1, 2]);
    // o segundo ônibus só parte depois que o primeiro chega (+ margem de baldeação)
    const [a, b] = it1.trechos;
    expect(b.partidaS).toBeGreaterThanOrEqual(a.chegadaS + 60);
  });

  it('inclui caminhada até um ponto próximo', () => {
    // O ponto 4 fica a ~80 m do ponto 1, mas nenhuma linha passa nele.
    const [it1] = planejar(rede, [onibus(1, 0)], 4, 2);
    expect(it1.trechos[0]).toMatchObject({ tipo: 'caminhada', deId: 4, paraId: 1 });
  });

  it('no modo acessível, ignora ônibus sem acessibilidade e caminhadas', () => {
    expect(planejar(rede, [onibus(1, 0, false)], 1, 2, { acessivel: true })).toHaveLength(0);
    expect(planejar(rede, [onibus(1, 0)], 4, 2, { acessivel: true })).toHaveLength(0);
  });

  it('não devolve nada quando não há ônibus em operação', () => {
    expect(planejar(rede, [], 1, 3)).toHaveLength(0);
  });
});
