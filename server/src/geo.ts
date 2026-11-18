// Funções geográficas usadas pelo simulador e pelo cálculo de previsão.

export type Coord = [lat: number, lng: number];

const RAIO_TERRA_M = 6_371_000;
const rad = (graus: number) => (graus * Math.PI) / 180;

/**
 * Distância em metros entre dois pontos na superfície da Terra (fórmula de Haversine).
 * Considera a curvatura do planeta, o que uma distância "reta" em graus não faz.
 */
export function distanciaM(a: Coord, b: Coord): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_M * Math.asin(Math.sqrt(h));
}

/**
 * Para cada vértice do trajeto, a distância acumulada desde o início.
 * Calculado uma vez por linha; depois, achar "onde estou a X metros" é rápido.
 */
export function distanciasAcumuladas(trajeto: Coord[]): number[] {
  const acc = [0];
  for (let i = 1; i < trajeto.length; i++) {
    acc.push(acc[i - 1] + distanciaM(trajeto[i - 1], trajeto[i]));
  }
  return acc;
}

/**
 * Coordenada que fica a `dist` metros do início do trajeto.
 * Usa busca binária no vetor acumulado (O(log n)) e interpola dentro do trecho.
 */
export function pontoNaDistancia(trajeto: Coord[], acc: number[], dist: number): Coord {
  const total = acc[acc.length - 1];
  const d = ((dist % total) + total) % total; // o trajeto é circular (ida + volta)
  let lo = 0;
  let hi = acc.length - 1;
  while (lo < hi - 1) {
    const meio = (lo + hi) >> 1;
    if (acc[meio] <= d) lo = meio;
    else hi = meio;
  }
  const trecho = acc[hi] - acc[lo] || 1;
  const t = (d - acc[lo]) / trecho;
  const [a, b] = [trajeto[lo], trajeto[hi]];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Direção (0–360°, 0 = norte) de a para b; usada para girar o ícone do ônibus. */
export function rumo(a: Coord, b: Coord): number {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x =
    Math.cos(rad(a[0])) * Math.sin(rad(b[0])) -
    Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Pedaço do trajeto que começa a `inicio` metros e segue por `comprimento`
 * metros (dando a volta no circuito se precisar). Usado para desenhar no
 * mapa só a parte da linha que a pessoa vai percorrer.
 */
export function trechoDoTrajeto(trajeto: Coord[], acc: number[], inicio: number, comprimento: number): Coord[] {
  const total = acc[acc.length - 1];
  const aFrente = (d: number) => (((d - inicio) % total) + total) % total;
  const meio = acc
    .slice(0, -1) // o último vértice repete o primeiro (circuito fechado)
    .map((d, i) => ({ i, off: aFrente(d) }))
    .filter((v) => v.off > 0 && v.off < comprimento)
    .sort((a, b) => a.off - b.off)
    .map((v) => trajeto[v.i]);
  return [
    pontoNaDistancia(trajeto, acc, inicio),
    ...meio,
    pontoNaDistancia(trajeto, acc, inicio + comprimento),
  ];
}
