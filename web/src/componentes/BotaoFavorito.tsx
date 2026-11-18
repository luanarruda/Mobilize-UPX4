import type { TipoFavorito } from '../api';
import { useFavoritos } from '../contexto/Favoritos';

interface Props {
  tipo: TipoFavorito;
  id: number;
  /** Nome lido pelo leitor de tela, ex.: "linha 201" ou "ponto Facens". */
  nome: string;
  compacto?: boolean;
}

/** Estrela de favorito. aria-pressed diz ao leitor de tela se está marcada. */
export function BotaoFavorito({ tipo, id, nome, compacto }: Props) {
  const { ehFavorito, alternar } = useFavoritos();
  const marcado = ehFavorito({ tipo, id });
  const rotulo = marcado ? `Remover ${nome} dos favoritos` : `Adicionar ${nome} aos favoritos`;

  return (
    <button
      type="button"
      className={`botao-favorito${marcado ? ' marcado' : ''}${compacto ? ' compacto' : ''}`}
      aria-pressed={marcado}
      aria-label={rotulo}
      title={rotulo}
      onClick={(e) => {
        e.preventDefault(); // quando está dentro de um link/cartão, não navega
        e.stopPropagation();
        alternar({ tipo, id });
      }}
    >
      <span aria-hidden="true">{marcado ? '★' : '☆'}</span>
      {!compacto && <span aria-hidden="true">{marcado ? ' Favorito' : ' Favoritar'}</span>}
    </button>
  );
}
