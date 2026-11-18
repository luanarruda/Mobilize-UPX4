// RF09 — Exibir e informar a lotação de um ônibus.
import { useState } from 'react';
import { api, ErroApi, type Lotacao } from '../api';
import { autorAnonimo, haQuanto } from '../util';

export const NIVEIS_LOTACAO = [
  { nome: 'Vazio', descricao: 'muitos lugares livres' },
  { nome: 'Lugares sentados', descricao: 'ainda há assentos' },
  { nome: 'Em pé', descricao: 'sem assentos, com espaço' },
  { nome: 'Lotado', descricao: 'difícil de entrar' },
] as const;

/**
 * Selo de lotação: barras (visual) + texto. A cor ajuda, mas o nível está
 * sempre escrito, então a informação não depende de enxergar cores.
 */
export function SeloLotacao({ lotacao, compacto }: { lotacao: Lotacao | null; compacto?: boolean }) {
  if (!lotacao) {
    return compacto
      ? <span className="selo-lotacao sem-info"><span aria-hidden="true">—</span><span className="visualmente-oculto">não informada</span></span>
      : <span className="selo-lotacao sem-info">Lotação não informada</span>;
  }
  const nivel = NIVEIS_LOTACAO[lotacao.nivel];
  return (
    <span className={`selo-lotacao nivel-${lotacao.nivel}`}>
      <span className="barras" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <span key={i} className={i <= lotacao.nivel ? 'cheia' : undefined} />)}
      </span>
      <span>
        {nivel.nome}
        {!compacto && <span className="selo-fonte">
          {' '}· {lotacao.relatos === 1 ? '1 pessoa informou' : `${lotacao.relatos} pessoas informaram`}, {haQuanto(lotacao.atualizadoEm)}
        </span>}
      </span>
    </span>
  );
}

interface Props {
  veiculoId: number;
  prefixo: string;
  /** Chamado com a lotação atualizada depois do envio. */
  aoInformar?: (l: Lotacao | null) => void;
}

/** Botão que abre as quatro opções de lotação; um clique já envia. */
export function InformarLotacao({ veiculoId, prefixo, aoInformar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<'ocioso' | 'enviando' | 'ok' | 'erro'>('ocioso');
  const [mensagem, setMensagem] = useState('');

  const enviar = async (nivel: number) => {
    setEstado('enviando');
    try {
      const r = await api.informarLotacao(veiculoId, nivel, autorAnonimo());
      setEstado('ok');
      setMensagem('Obrigado! Sua informação ajuda quem está esperando.');
      setAberto(false);
      aoInformar?.(r.lotacao);
    } catch (e) {
      setEstado('erro');
      setMensagem(e instanceof ErroApi ? e.message : 'Não foi possível enviar. Tente de novo.');
    }
  };

  return (
    <div className="informar-lotacao">
      {!aberto ? (
        <button type="button" className="botao-link" onClick={() => { setAberto(true); setEstado('ocioso'); }}>
          Informar lotação
        </button>
      ) : (
        <div role="group" aria-label={`Como está a lotação do ônibus ${prefixo}?`} className="opcoes-lotacao">
          <p className="passo-sub">Como está o ônibus {prefixo}?</p>
          {NIVEIS_LOTACAO.map((n, i) => (
            <button
              key={n.nome}
              type="button"
              className={`botao-lotacao nivel-${i}`}
              disabled={estado === 'enviando'}
              onClick={() => enviar(i)}
            >
              <span className="barras" aria-hidden="true">
                {[0, 1, 2, 3].map((b) => <span key={b} className={b <= i ? 'cheia' : undefined} />)}
              </span>
              {n.nome}
            </button>
          ))}
          <button type="button" className="botao-link" onClick={() => setAberto(false)}>Cancelar</button>
        </div>
      )}
      <p className={estado === 'erro' ? 'aviso-erro' : 'passo-sub'} role="status" aria-live="polite">
        {estado === 'ok' || estado === 'erro' ? mensagem : ''}
      </p>
    </div>
  );
}
