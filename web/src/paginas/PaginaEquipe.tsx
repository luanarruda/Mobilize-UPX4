// RF10 — Área da equipe: leitura das mensagens recebidas pelo canal de feedback.
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, type FeedbackRecebido, type StatusFeedback } from '../api';
import { useSessao } from '../contexto/Sessao';

const NOME_TIPO = { sugestao: 'Sugestão', elogio: 'Elogio', problema: 'Problema' } as const;
const NOME_STATUS: Record<StatusFeedback, string> = { novo: 'Novas', lido: 'Lidas', resolvido: 'Resolvidas' };

export function PaginaEquipe() {
  const { usuario, carregando } = useSessao();
  const [filtro, setFiltro] = useState<StatusFeedback>('novo');
  const [lista, setLista] = useState<FeedbackRecebido[]>([]);
  const [contagem, setContagem] = useState<Partial<Record<StatusFeedback, number>>>({});
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api.feedbacks(filtro)
      .then((r) => { setLista(r.feedbacks); setContagem(r.contagem); })
      .catch(() => setErro('Não foi possível carregar as mensagens.'));
  }, [filtro]);

  useEffect(() => {
    document.title = 'Mensagens recebidas — RotaCerta';
    if (usuario?.papel === 'equipe') carregar();
  }, [usuario, carregar]);

  if (carregando) return <div className="pagina-texto"><p>Carregando…</p></div>;
  if (!usuario) return <Navigate to="/entrar?voltar=/equipe" replace />;
  if (usuario.papel !== 'equipe') {
    return <div className="pagina-texto"><h1>Acesso restrito</h1><p>Esta área é só para a equipe do RotaCerta.</p></div>;
  }

  const mudar = async (id: number, status: StatusFeedback) => {
    await api.mudarStatusFeedback(id, status).catch(() => setErro('Não foi possível atualizar.'));
    carregar();
  };

  return (
    <div className="pagina-texto">
      <h1>Mensagens recebidas</h1>
      <div className="abas" role="group" aria-label="Filtrar por situação">
        {(Object.keys(NOME_STATUS) as StatusFeedback[]).map((s) => (
          <button key={s} type="button" aria-pressed={filtro === s} onClick={() => setFiltro(s)}>
            {NOME_STATUS[s]} ({contagem[s] ?? 0})
          </button>
        ))}
      </div>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {lista.length === 0 && <p>Nenhuma mensagem aqui.</p>}

      <ul className="lista-feedback">
        {lista.map((f) => (
          <li key={f.id} className={`feedback feedback-${f.tipo}`}>
            <p className="feedback-topo">
              <span className="feedback-tipo">{NOME_TIPO[f.tipo]}</span>
              <span>#{f.id}</span>
              {f.linha && <span>Linha {f.linha}</span>}
              <span>{new Date(f.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </p>
            <p className="feedback-texto">{f.mensagem}</p>
            <p className="passo-sub">{f.email ? <>Contato: <a href={`mailto:${f.email}`}>{f.email}</a></> : 'Sem contato informado'}</p>
            <div className="acoes">
              {f.status !== 'lido' && <button type="button" className="botao-secundario" onClick={() => mudar(f.id, 'lido')}>Marcar como lida</button>}
              {f.status !== 'resolvido' && <button type="button" className="botao-secundario" onClick={() => mudar(f.id, 'resolvido')}>Marcar como resolvida</button>}
              {f.status !== 'novo' && <button type="button" className="botao-link" onClick={() => mudar(f.id, 'novo')}>Voltar para novas</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
