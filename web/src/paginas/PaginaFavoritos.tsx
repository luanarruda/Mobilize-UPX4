// RF06 — Favoritos, com a próxima chegada de cada ônibus nos pontos.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Previsoes } from '../api';
import { useFavoritos } from '../contexto/Favoritos';
import { useSessao } from '../contexto/Sessao';
import { BotaoFavorito } from '../componentes/BotaoFavorito';

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

export function PaginaFavoritos() {
  const { itens, linhas, pontos, erro } = useFavoritos();
  const { usuario } = useSessao();

  useEffect(() => {
    document.title = 'Favoritos — RotaCerta';
  }, []);

  const pontosFav = itens.filter((i) => i.tipo === 'ponto').map((i) => pontos.find((p) => p.id === i.id)).filter((p) => !!p);
  const linhasFav = itens.filter((i) => i.tipo === 'linha').map((i) => linhas.find((l) => l.id === i.id)).filter((l) => !!l);

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
