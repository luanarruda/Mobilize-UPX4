// Tipos e chamadas à API do back-end.

export type Coord = [number, number];

export interface LinhaResumo {
  id: number;
  codigo: string;
  nome: string;
  cor: string;
  empresa: string | null;
  /** Nomes dos pontos atendidos (usado na busca). Ausente em alguns retornos. */
  pontos?: string[];
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

export interface LinhaDetalhe extends Omit<LinhaResumo, 'pontos'> {
  trajeto: Coord[];
  destinos: { ida: string; volta: string };
  pontos: PontoDaLinha[];
}

export type TipoDia = 'util' | 'sabado' | 'domingo';

export interface HorariosLinha {
  hoje: TipoDia;
  horarios: Record<TipoDia, string[]>;
}

export interface PontoDetalhe extends Omit<Ponto, 'linhas'> {
  linhas: Pick<LinhaResumo, 'id' | 'codigo' | 'nome' | 'cor'>[];
}

export interface GrupoPrevisao {
  linhaId: number;
  codigo: string;
  nome: string;
  cor: string;
  sentido: 'ida' | 'volta';
  destino: string;
  chegadas: { prefixo: string; acessivel: boolean; distanciaM: number; minutos: number }[];
  /** Quando não há ônibus em operação: horário previsto pela tabela ("HH:MM"). */
  proximaPelaTabela: string | null;
}

export interface Previsoes {
  atualizadoEm: string;
  previsoes: GrupoPrevisao[];
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
  horarios: (id: number) => get<HorariosLinha>(`/linhas/${id}/horarios`),
  pontos: () => get<Ponto[]>('/pontos'),
  ponto: (id: number) => get<PontoDetalhe>(`/pontos/${id}`),
  previsoes: (id: number) => get<Previsoes>(`/pontos/${id}/previsoes`),
};
