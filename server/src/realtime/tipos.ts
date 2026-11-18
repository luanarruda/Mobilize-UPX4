// Contrato entre "de onde vêm as posições" e o resto do sistema.
// Hoje só o simulador implementa esta interface. Quando houver dados reais da
// operação (Fase 1 do plano de aplicação), basta criar outro provedor com a
// mesma interface — a API e o front-end não mudam.

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
