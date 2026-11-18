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

interface TrechoBase {
  partidaS: number;
  chegadaS: number;
  caminho: Coord[];
}

export interface TrechoOnibus extends TrechoBase {
  tipo: 'onibus';
  linhaId: number;
  codigo: string;
  cor: string;
  nomeLinha: string;
  sentido: 'ida' | 'volta';
  destino: string;
  embarqueId: number;
  embarque: string;
  desembarqueId: number;
  desembarque: string;
  prefixo: string;
  acessivel: boolean;
  esperaS: number;
  paradas: number;
}

export interface TrechoCaminhada extends TrechoBase {
  tipo: 'caminhada';
  deId: number;
  de: string;
  paraId: number;
  para: string;
  distanciaM: number;
}

export type Trecho = TrechoOnibus | TrechoCaminhada;

export interface Itinerario {
  chegadaS: number;
  baldeacoes: number;
  trechos: Trecho[];
}

export interface ResultadoPlano {
  calculadoEm: string;
  itinerarios: Itinerario[];
}

export interface Preferencias {
  fonte?: 'normal' | 'grande' | 'muito-grande';
  altoContraste?: boolean;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  preferencias: Preferencias;
  criadoEm: string;
}

export type TipoFavorito = 'linha' | 'ponto';
export interface Favorito {
  tipo: TipoFavorito;
  id: number;
}

/** Erro com a mensagem amigável que a API devolveu em { erro: "..." }. */
export class ErroApi extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

async function requisitar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const resp = await fetch(`/api${caminho}`, {
    method: metodo,
    headers: corpo ? { 'content-type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
    credentials: 'same-origin', // envia o cookie de sessão
  });
  if (!resp.ok) {
    const dados = await resp.json().catch(() => null);
    throw new ErroApi(resp.status, dados?.erro ?? `Falha na comunicação com o servidor (${resp.status}).`);
  }
  return (resp.status === 204 ? null : await resp.json()) as T;
}

const get = <T,>(caminho: string) => requisitar<T>('GET', caminho);

export const api = {
  linhas: () => get<LinhaResumo[]>('/linhas'),
  linha: (id: number) => get<LinhaDetalhe>(`/linhas/${id}`),
  horarios: (id: number) => get<HorariosLinha>(`/linhas/${id}/horarios`),
  pontos: () => get<Ponto[]>('/pontos'),
  ponto: (id: number) => get<PontoDetalhe>(`/pontos/${id}`),
  previsoes: (id: number) => get<Previsoes>(`/pontos/${id}/previsoes`),
  eu: () => get<{ usuario: Usuario | null }>('/auth/eu'),
  entrar: (email: string, senha: string) => requisitar<{ usuario: Usuario }>('POST', '/auth/login', { email, senha }),
  cadastrar: (dados: { nome: string; email: string; senha: string; aceite: boolean }) =>
    requisitar<{ usuario: Usuario }>('POST', '/auth/cadastro', dados),
  sair: () => requisitar<null>('POST', '/auth/logout'),
  excluirConta: () => requisitar<null>('DELETE', '/auth/conta'),
  salvarPreferencias: (p: Preferencias) => requisitar<{ preferencias: Preferencias }>('PUT', '/auth/preferencias', p),

  favoritos: () => get<Favorito[]>('/favoritos'),
  favoritar: (f: Favorito) => requisitar<Favorito[]>('PUT', `/favoritos/${f.tipo}/${f.id}`),
  desfavoritar: (f: Favorito) => requisitar<Favorito[]>('DELETE', `/favoritos/${f.tipo}/${f.id}`),
  importarFavoritos: (itens: Favorito[]) => requisitar<Favorito[]>('POST', '/favoritos/importar', { itens }),

  planejar: (origem: number, destino: number, acessivel: boolean) =>
    get<ResultadoPlano>(`/planejar?origem=${origem}&destino=${destino}&acessivel=${acessivel ? 1 : 0}`),
};
