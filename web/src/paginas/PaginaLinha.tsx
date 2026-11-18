// RF03 — Página de uma linha: itinerário, horários e ônibus ao vivo.
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type HorariosLinha, type LinhaDetalhe, type TipoDia } from '../api';
import { usePosicoes } from '../hooks/usePosicoes';
import { MapaFrota } from '../componentes/MapaFrota';
import { NOME_TIPO_DIA } from '../util';

const minutosAgora = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const emMinutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

export function PaginaLinha() {
  const id = Number(useParams().id);
  const [linha, setLinha] = useState<LinhaDetalhe | null>(null);
  const [horarios, setHorarios] = useState<HorariosLinha | null>(null);
  const [tipo, setTipo] = useState<TipoDia>('util');
  const [erro, setErro] = useState<string | null>(null);
  const { posicoes } = usePosicoes();

  useEffect(() => {
    setLinha(null);
    setErro(null);
    Promise.all([api.linha(id), api.horarios(id)])
      .then(([l, h]) => {
        setLinha(l);
        setHorarios(h);
        setTipo(h.hoje);
        document.title = `Linha ${l.codigo} — RotaCerta`;
      })
      .catch(() => setErro('Linha não encontrada ou indisponível.'));
  }, [id]);

  const veiculos = useMemo(() => [...posicoes.values()].filter((v) => v.linhaId === id), [posicoes, id]);
  const visiveis = useMemo(() => new Set([id]), [id]);
  const linhasMapa = useMemo(() => (linha ? [linha] : []), [linha]);
  const pontosMapa = useMemo(
    () =>
      linha
        ? [...new Map(linha.pontos.map((p) => [p.id, { ...p, linhas: [linha.codigo] }])).values()]
        : [],
    [linha],
  );

  if (erro) return <div className="pagina-texto"><p className="aviso-erro" role="alert">{erro}</p><Link to="/linhas">Voltar às linhas</Link></div>;
  if (!linha || !horarios) return <div className="pagina-texto"><p>Carregando…</p></div>;

  const agora = minutosAgora();
  const lista = horarios.horarios[tipo];
  const ehHoje = tipo === horarios.hoje;
  const proximas = ehHoje ? lista.filter((h) => emMinutos(h) >= agora).slice(0, 4) : [];

  return (
    <div className="pagina-linha">
      <div className="pagina-texto">
        <p className="migalha"><Link to="/linhas">Linhas</Link> › {linha.codigo}</p>
        <h1 className="titulo-linha">
          <span className="codigo-linha" style={{ background: linha.cor }}>{linha.codigo}</span>
          {linha.nome}
        </h1>
        <p className="cartao-sub">
          {linha.empresa} · {veiculos.length} ônibus em operação agora
          {' · '}
          {veiculos.filter((v) => v.acessivel).length} com acessibilidade
        </p>

        <section aria-labelledby="titulo-proximas" className="bloco">
          <h2 id="titulo-proximas">Próximas saídas de {linha.pontos[0].nome}</h2>
          {proximas.length > 0 ? (
            <ul className="proximas">
              {proximas.map((h) => <li key={h}>{h}</li>)}
            </ul>
          ) : (
            <p>{ehHoje ? 'Não há mais saídas hoje.' : `Hoje é ${NOME_TIPO_DIA[horarios.hoje].toLowerCase()}.`}</p>
          )}
        </section>

        <section aria-labelledby="titulo-itinerario" className="bloco">
          <h2 id="titulo-itinerario">Itinerário</h2>
          <div className="itinerarios">
            {(['ida', 'volta'] as const).map((sentido) => (
              <div key={sentido}>
                <h3>Sentido {linha.destinos[sentido]}</h3>
                <ol className="itinerario" style={{ ['--cor' as string]: linha.cor }}>
                  {linha.pontos
                    .filter((p) => p.sentido === sentido)
                    .concat(sentido === 'volta' ? [{ ...linha.pontos[0], sentido: 'volta' }] : [])
                    .map((p, i) => (
                      <li key={`${p.id}-${i}`}>
                        <Link to={`/pontos/${p.id}`}>{p.nome}</Link>
                        {p.acessivel && (
                          <span className="selo" title="Ponto acessível">
                            <span aria-hidden="true">♿</span>
                            <span className="visualmente-oculto">acessível</span>
                          </span>
                        )}
                      </li>
                    ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="titulo-horarios" className="bloco">
          <h2 id="titulo-horarios">Quadro de horários</h2>
          <p className="cartao-sub">Saídas de {linha.pontos[0].nome}</p>
          {/* Abas acessíveis: setas não são exigidas aqui porque usamos botões
              com aria-pressed, que funcionam bem com Tab + Enter. */}
          <div className="abas" role="group" aria-label="Tipo de dia">
            {(Object.keys(NOME_TIPO_DIA) as TipoDia[]).map((t) => (
              <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)}>
                {NOME_TIPO_DIA[t]}
                {t === horarios.hoje && <span className="hoje"> (hoje)</span>}
              </button>
            ))}
          </div>
          <ul className="grade-horarios" aria-label={`Horários — ${NOME_TIPO_DIA[tipo]}`}>
            {lista.map((h) => (
              <li key={h} className={ehHoje && emMinutos(h) < agora ? 'passou' : undefined}>
                {h}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mapa-linha" aria-label={`Mapa da linha ${linha.codigo}`}>
        <MapaFrota
          linhas={linhasMapa}
          pontos={pontosMapa}
          veiculos={veiculos}
          visiveis={visiveis}
          selecionada={id}
          enquadrar
        />
      </section>
    </div>
  );
}
