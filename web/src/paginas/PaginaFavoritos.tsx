// RF06 + RF05 — Favoritos com a próxima chegada e os avisos das linhas seguidas.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Previsoes } from '../api';
import { useFavoritos } from '../contexto/Favoritos';
import { useSessao } from '../contexto/Sessao';
import { useTempoReal } from '../contexto/TempoReal';
import { BotaoFavorito } from '../componentes/BotaoFavorito';
import { ListaAvisos, notificacoesSuportadas, useOptInNotificacoes } from '../componentes/Avisos';

const ATUALIZAR_MS = 30_000;

/** Resumo de um ponto favorito: a próxima chegada de cada linha/sentido. */
function ResumoPonto({ id }: { id: number }) {
  const [dados, setDados] = useState<Previsoes | null>(null);
  useEffect(() => {
    const carregar = () => api.previsoes(id).then(setDados).catch(() => {});
    carregar();
    const t = setInterval(carregar, ATUALIZAR_MS);
    return () => clearInterval(t);
  }, [id]);

  if (!dados) return <p className="passo-sub">Carregando previsão…</p>;
  return (
    <ul className="resumo-previsoes">
      {dados.previsoes.map((g) => {
        const prox = g.chegadas[0];
        return (
          <li key={`${g.linhaId}-${g.sentido}`}>
            <span className="codigo-linha mini" style={{ background: g.cor }}>{g.codigo}</span>
            <span className="resumo-destino">{g.destino}</span>
            <strong>
              {prox ? (prox.minutos <= 0 ? 'chegando' : `${prox.minutos} min`) : g.proximaPelaTabela ? `~${g.proximaPelaTabela}` : '—'}
            </strong>
          </li>
        );
      })}
    </ul>
  );
}

function ControleNotificacoes() {
  const { ativo, ativar, desativar } = useOptInNotificacoes();
  const [msg, setMsg] = useState<string | null>(null);

  if (!notificacoesSuportadas()) {
    return <p className="passo-sub">Este navegador (ou este endereço) não permite notificações. Os avisos continuam aparecendo no topo do site.</p>;
  }
  return (
    <div className="controle-notificacoes">
      {ativo ? (
        <>
          <p><span aria-hidden="true">🔔 </span>Notificações ativadas. Você recebe um aviso do navegador quando surgir um problema nas suas linhas e o RotaCerta estiver em outra aba.</p>
          <button type="button" className="botao-secundario" onClick={desativar}>Desativar notificações</button>
        </>
      ) : (
        <>
          <p>Receba um aviso do navegador quando houver atraso, desvio ou interrupção nas suas linhas, mesmo com o RotaCerta em outra aba.</p>
          <button
            type="button"
            className="botao-primario"
            onClick={async () => {
              const r = await ativar();
              setMsg(r === 'negado' ? 'O navegador bloqueou as notificações. Libere nas configurações do site (ícone de cadeado na barra de endereço).' : null);
            }}
          >
            Receber avisos no navegador
          </button>
        </>
      )}
      {msg && <p className="aviso-erro" role="alert">{msg}</p>}
    </div>
  );
}

export function PaginaFavoritos() {
  const { itens, linhas, pontos, linhasSeguidas, erro } = useFavoritos();
  const { usuario } = useSessao();
  const { avisos } = useTempoReal();

  useEffect(() => {
    document.title = 'Favoritos — RotaCerta';
  }, []);

  const pontosFav = itens.filter((i) => i.tipo === 'ponto').map((i) => pontos.find((p) => p.id === i.id)).filter((p) => !!p);
  const linhasFav = itens.filter((i) => i.tipo === 'linha').map((i) => linhas.find((l) => l.id === i.id)).filter((l) => !!l);
  const meusAvisos = avisos.filter((a) => linhasSeguidas.has(a.linhaId));

  return (
    <div className="pagina-texto">
      <h1>Favoritos</h1>
      {!usuario && (
        <p className="nota-conta">
          Seus favoritos estão salvos só neste navegador.{' '}
          <Link to="/entrar?voltar=/favoritos">Entre</Link> ou <Link to="/cadastro?voltar=/favoritos">crie uma conta</Link>{' '}
          para usá-los em outros computadores.
        </p>
      )}
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      {itens.length === 0 ? (
        <section className="bloco">
          <p>Você ainda não tem favoritos.</p>
          <p>
            Para adicionar, toque na estrela <span aria-hidden="true">☆</span> <strong>Favoritar</strong> na página de uma{' '}
            <Link to="/linhas">linha ou ponto</Link>. Os pontos favoritos aparecem aqui com a próxima chegada de cada ônibus.
          </p>
        </section>
      ) : (
        <>
          <section className="bloco" aria-labelledby="titulo-avisos-fav">
            <h2 id="titulo-avisos-fav">Avisos nas suas linhas</h2>
            {meusAvisos.length > 0 ? <ListaAvisos avisos={meusAvisos} /> : <p>Nenhum problema nas suas linhas agora.</p>}
            <ControleNotificacoes />
          </section>

          {pontosFav.length > 0 && (
            <section className="bloco" aria-labelledby="titulo-pontos-fav">
              <h2 id="titulo-pontos-fav">Pontos</h2>
              <ul className="cartoes">
                {pontosFav.map((p) => (
                  <li key={p.id} className="cartao cartao-fav">
                    <div className="cartao-fav-topo">
                      <Link to={`/pontos/${p.id}`} className="cartao-titulo">{p.nome}</Link>
                      <BotaoFavorito tipo="ponto" id={p.id} nome={`ponto ${p.nome}`} compacto />
                    </div>
                    <ResumoPonto id={p.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {linhasFav.length > 0 && (
            <section className="bloco" aria-labelledby="titulo-linhas-fav">
              <h2 id="titulo-linhas-fav">Linhas</h2>
              <ul className="cartoes">
                {linhasFav.map((l) => (
                  <li key={l.id} className="cartao">
                    <span className="codigo-linha" style={{ background: l.cor }}>{l.codigo}</span>
                    <Link to={`/linhas/${l.id}`} className="cartao-titulo cartao-expande">{l.nome}</Link>
                    <BotaoFavorito tipo="linha" id={l.id} nome={`linha ${l.codigo}`} compacto />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
