// RF02 — Previsão de chegada.
//
// Ideia: cada ônibus sabe quantos metros já andou no trajeto da linha
// (distanciaNoTrajeto) e cada ponto sabe a quantos metros fica do início
// (distanciaM). A diferença é quanto falta. O tempo estimado é:
//
//   tempo = distância que falta / velocidade operacional
//         + (nº de pontos no caminho × tempo médio parado em cada um)
//
// "Velocidade operacional" é a média dos ônibus da linha que estão andando
// agora: se a linha toda está lenta (trânsito), a previsão acompanha.

import type { LinhaCatalogo } from './catalogo.js';
import type { PosicaoVeiculo } from '../realtime/tipos.js';

export const PARAMETROS = {
  velocidadePadraoKmh: 22,      // usada quando não há ônibus andando na linha
  velocidadeMinKmh: 12,
  velocidadeMaxKmh: 40,
  paradaMediaS: 25,             // tempo médio parado em cada ponto intermediário
  chegandoM: 60,                // abaixo disso, mostra "chegando"
  horizonteMin: 90,             // previsões além disso não são exibidas
};

export interface PrevisaoVeiculo {
  linhaId: number;
  sentido: 'ida' | 'volta';
  veiculoId: number;
  prefixo: string;
  acessivel: boolean;
  distanciaM: number;
  segundos: number;
}

/** Distância "para frente" de a até b num circuito de comprimento total. */
export const aFrente = (a: number, b: number, total: number) => (((b - a) % total) + total) % total;

export function velocidadeOperacionalKmh(veiculos: PosicaoVeiculo[]) {
  const andando = veiculos.filter((v) => v.velocidadeKmh > 0);
  if (andando.length === 0) return PARAMETROS.velocidadePadraoKmh;
  const media = andando.reduce((s, v) => s + v.velocidadeKmh, 0) / andando.length;
  return Math.min(PARAMETROS.velocidadeMaxKmh, Math.max(PARAMETROS.velocidadeMinKmh, media));
}

/**
 * Tempo estimado (em segundos) para percorrer `distanciaM` a partir de
 * `inicioM`, contando as paradas intermediárias da linha.
 */
export function estimarSegundos(linha: LinhaCatalogo, inicioM: number, distanciaM: number, velKmh: number) {
  if (distanciaM <= PARAMETROS.chegandoM) return 0;
  const paradasNoCaminho = linha.paradas.filter((p) => {
    const d = aFrente(inicioM, p.distanciaM, linha.totalM);
    return d > 1 && d < distanciaM - 1;
  }).length;
  return distanciaM / (velKmh / 3.6) + paradasNoCaminho * PARAMETROS.paradaMediaS;
}

/** Previsões, ordenadas pela mais próxima, de todos os ônibus da linha até o ponto. */
export function preverChegadas(
  linha: LinhaCatalogo,
  pontoId: number,
  veiculosDaLinha: PosicaoVeiculo[],
): PrevisaoVeiculo[] {
  const vel = velocidadeOperacionalKmh(veiculosDaLinha);
  const resultado: PrevisaoVeiculo[] = [];

  // Um ponto pode aparecer duas vezes na linha (ida e volta): cada passagem
  // é uma previsão separada, porque leva a destinos diferentes.
  for (const parada of linha.paradas.filter((p) => p.pontoId === pontoId)) {
    for (const v of veiculosDaLinha) {
      const distanciaM = aFrente(v.distanciaNoTrajeto, parada.distanciaM, linha.totalM);
      const segundos = estimarSegundos(linha, v.distanciaNoTrajeto, distanciaM, vel);
      if (segundos / 60 > PARAMETROS.horizonteMin) continue;
      resultado.push({
        linhaId: linha.id,
        sentido: parada.sentido,
        veiculoId: v.veiculoId,
        prefixo: v.prefixo,
        acessivel: v.acessivel,
        distanciaM: Math.round(distanciaM),
        segundos: Math.round(segundos),
      });
    }
  }
  return resultado.sort((a, b) => a.segundos - b.segundos);
}
