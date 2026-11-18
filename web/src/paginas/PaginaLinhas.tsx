// RF03 — Consulta de linhas, pontos e horários: busca.
import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type LinhaResumo, type Ponto } from '../api';
import { normalizar } from '../util';

export function PaginaLinhas() {
  const [linhas, setLinhas] = useState<LinhaResumo[]>([]);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState(false);
  const idBusca = useId();

  useEffect(() => {
    Promise.all([api.linhas(), api.pontos()])
      .then(([l, p]) => {
        setLinhas(l);
        setPontos(p);
      })
      .catch(() => setErro(true));
  }, []);

  const termo = normalizar(busca);
  // Uma linha aparece se o termo bate com o número, o nome ou algum ponto dela.
  const linhasFiltradas = useMemo(
    () =>
      linhas.filter((l) =>
        [l.codigo, l.nome, ...(l.pontos ?? [])].some((t) => normalizar(t).includes(termo)),
      ),
    [linhas, termo],
  );
  const pontosFiltrados = useMemo(
    () => (termo ? pontos.filter((p) => normalizar(p.nome).includes(termo)) : []),
    [pontos, termo],
  );

  return (
    <div className="pagina-texto">
      <h1>Linhas e horários</h1>

      <form className="busca" role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor={idBusca}>Buscar por número da linha, bairro ou ponto</label>
        <input
          id={idBusca}
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Ex.: 201, Facens, Campolim"
          autoComplete="off"
        />
      </form>

      {erro && <p className="aviso-erro" role="alert">Não foi possível carregar as linhas. Recarregue a página.</p>}

      {/* Anuncia a quantidade de resultados enquanto a pessoa digita. */}
      <p className="contagem" role="status" aria-live="polite">
        {termo &&
          `${linhasFiltradas.length} ${linhasFiltradas.length === 1 ? 'linha' : 'linhas'} e ${pontosFiltrados.length} ${
            pontosFiltrados.length === 1 ? 'ponto' : 'pontos'
          } encontrados`}
      </p>

      {pontosFiltrados.length > 0 && (
        <section aria-labelledby="titulo-pontos">
          <h2 id="titulo-pontos">Pontos de parada</h2>
          <ul className="cartoes">
            {pontosFiltrados.map((p) => (
              <li key={p.id}>
                <Link to={`/pontos/${p.id}`} className="cartao">
                  <span>
                    <span className="cartao-titulo">
                      {p.nome}
                      {p.acessivel && <span className="selo">♿ acessível</span>}
                    </span>
                    <span className="cartao-sub">Linhas {p.linhas.join(', ')}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-lista-linhas">
        <h2 id="titulo-lista-linhas">Linhas</h2>
        {termo && linhasFiltradas.length === 0 && <p>Nenhuma linha encontrada para "{busca}".</p>}
        <ul className="cartoes">
          {linhasFiltradas.map((l) => (
            <li key={l.id}>
              <Link to={`/linhas/${l.id}`} className="cartao">
                <span className="codigo-linha" style={{ background: l.cor }}>{l.codigo}</span>
                <span>
                  <span className="cartao-titulo">{l.nome}</span>
                  {l.empresa && <span className="cartao-sub">{l.empresa}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
