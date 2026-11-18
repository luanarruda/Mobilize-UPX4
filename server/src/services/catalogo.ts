// Catálogo da rede: linhas, pontos e itinerários lidos do banco uma vez e
// mantidos em memória. Esses dados mudam raramente (só quando a operação
// altera itinerários), então não faz sentido consultar o banco a cada pedido.
import { db } from '../db/conexao.js';
import { distanciasAcumuladas, type Coord } from '../geo.js';

export interface ParadaLinha {
  ordem: number;
  pontoId: number;
  sentido: 'ida' | 'volta';
  distanciaM: number;
}

export interface LinhaCatalogo {
  id: number;
  codigo: string;
  nome: string;
  cor: string;
  empresa: string | null;
  trajeto: Coord[];
  /** Comprimento do circuito completo (ida + volta), em metros. */
  totalM: number;
  paradas: ParadaLinha[];
}

export interface PontoCatalogo {
  id: number;
  nome: string;
  lat: number;
  lng: number;
  acessivel: boolean;
  coberto: boolean;
}

let linhas: Map<number, LinhaCatalogo> | undefined;
let pontos: Map<number, PontoCatalogo> | undefined;

function carregar() {
  const brutas = db.prepare('SELECT id, codigo, nome, cor, empresa, trajeto FROM linhas ORDER BY codigo').all() as {
    id: number; codigo: string; nome: string; cor: string; empresa: string | null; trajeto: string;
  }[];
  const lp = db
    .prepare('SELECT linha_id, ordem, ponto_id, sentido, distancia_m FROM linha_pontos ORDER BY linha_id, ordem')
    .all() as { linha_id: number; ordem: number; ponto_id: number; sentido: 'ida' | 'volta'; distancia_m: number }[];

  linhas = new Map();
  for (const l of brutas) {
    const trajeto = JSON.parse(l.trajeto) as Coord[];
    const acc = distanciasAcumuladas(trajeto);
    linhas.set(l.id, {
      ...l,
      trajeto,
      totalM: acc[acc.length - 1],
      paradas: lp
        .filter((r) => r.linha_id === l.id)
        .map((r) => ({ ordem: r.ordem, pontoId: r.ponto_id, sentido: r.sentido, distanciaM: r.distancia_m })),
    });
  }

  const brutosPontos = db.prepare('SELECT id, nome, lat, lng, acessivel, coberto FROM pontos').all() as {
    id: number; nome: string; lat: number; lng: number; acessivel: number; coberto: number;
  }[];
  pontos = new Map(
    brutosPontos.map((p) => [p.id, { ...p, acessivel: Boolean(p.acessivel), coberto: Boolean(p.coberto) }]),
  );
}

export const catalogo = {
  linhas(): LinhaCatalogo[] {
    if (!linhas) carregar();
    return [...linhas!.values()];
  },
  linha(id: number) {
    if (!linhas) carregar();
    return linhas!.get(id);
  },
  pontos(): PontoCatalogo[] {
    if (!pontos) carregar();
    return [...pontos!.values()];
  },
  ponto(id: number) {
    if (!pontos) carregar();
    return pontos!.get(id);
  },
  /** Linhas que passam no ponto (uma entrada por linha). */
  linhasDoPonto(pontoId: number) {
    return this.linhas().filter((l) => l.paradas.some((p) => p.pontoId === pontoId));
  },
  /** Nome do destino de um sentido: último ponto da ida, ou o terminal inicial na volta. */
  destino(linha: LinhaCatalogo, sentido: 'ida' | 'volta') {
    const id = sentido === 'ida'
      ? linha.paradas.filter((p) => p.sentido === 'ida').at(-1)!.pontoId
      : linha.paradas[0].pontoId;
    return this.ponto(id)!.nome;
  },
};
