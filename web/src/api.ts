// Tipos e chamadas à API do back-end.

export type Coord = [number, number];

export interface LinhaResumo {
  id: number;
  codigo: string;
  nome: string;
  cor: string;
  empresa: string;
}

export interface PontoDaLinha {
  id: number;
  ordem: number;
  sentido: 'ida' | 'volta';
  distanciaM: number;
  nome: string;
  lat: number;
  lng: number;
  acessivel: boolean;
  coberto: boolean;
}

export interface LinhaDetalhe extends LinhaResumo {
  trajeto: Coord[];
  pontos: PontoDaLinha[];
}

export interface Ponto {
  id: number;
  nome: string;
  lat: number;
  lng: number;
  acessivel: boolean;
  coberto: boolean;
  linhas: string[];
}

export interface PosicaoVeiculo {
  veiculoId: number;
  prefixo: string;
  linhaId: number;
  lat: number;
  lng: number;
  rumo: number;
  velocidadeKmh: number;
  acessivel: boolean;
  distanciaNoTrajeto: number;
  atualizadoEm: string;
}

async function get<T>(caminho: string): Promise<T> {
  const resp = await fetch(`/api${caminho}`);
  if (!resp.ok) throw new Error(`Falha ao carregar ${caminho} (${resp.status})`);
  return resp.json() as Promise<T>;
}

export const api = {
  linhas: () => get<LinhaResumo[]>('/linhas'),
  linha: (id: number) => get<LinhaDetalhe>(`/linhas/${id}`),
  pontos: () => get<Ponto[]>('/pontos'),
};
