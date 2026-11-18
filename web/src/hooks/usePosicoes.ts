// Atalho mantido por compatibilidade: as páginas continuam chamando
// usePosicoes(), mas a conexão agora é única (contexto/TempoReal.tsx).
import { useTempoReal } from '../contexto/TempoReal';

export type { StatusConexao } from '../contexto/TempoReal';

export function usePosicoes() {
  const { posicoes, status } = useTempoReal();
  return { posicoes, status };
}
