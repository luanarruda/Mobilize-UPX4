// Contrato entre "de onde vêm as posições" e o resto do sistema.
// O simulador e, futuramente, o adaptador da SPTrans implementam a mesma
// interface — trocar a fonte não muda a API nem o front-end.

export interface PosicaoVeiculo {
  veiculoId: number;
  prefixo: string;
  linhaId: number;
  lat: number;
  lng: number;
  rumo: number;           // direção em graus (0 = norte)
  velocidadeKmh: number;
  acessivel: boolean;
  /** Metros percorridos no trajeto da linha; usado na previsão de chegada. */
  distanciaNoTrajeto: number;
  atualizadoEm: string;   // ISO 8601
}

export interface ProvedorPosicoes {
  readonly nome: string;
  iniciar(aoAtualizar: (posicoes: PosicaoVeiculo[]) => void): Promise<void>;
  parar(): void;
}
