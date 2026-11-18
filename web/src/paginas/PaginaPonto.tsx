// RF02 — Previsão de chegada em um ponto de parada.
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type PontoDetalhe, type Previsoes } from '../api';
import { horarioDaqui } from '../util';
import { BotaoFavorito } from '../componentes/BotaoFavorito';
import { InformarLotacao, SeloLotacao } from '../componentes/Lotacao';

const ATUALIZAR_MS = 15_000;

function TextoChegada({ minutos }: { minutos: number }) {
  if (minutos <= 0) return <strong className="chegando">Chegando</strong>;
  return (
    <>
      <strong>{minutos} min</strong>
      <span className="relogio"> · às {horarioDaqui(minutos)}</span>
    </>
  );
}

export function PaginaPonto() {
  const id = Number(useParams().id);
  const [ponto, setPonto] = useState<PontoDetalhe | null>(null);
  const [dados, setDados] = useState<Previsoes | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const atualizar = useCallback(() => {
    api.previsoes(id).then(setDados).catch(() => setErro('Não foi possível atualizar a previsão.'));
  }, [id]);

  useEffect(() => {
    api
      .ponto(id)
      .then((p) => {
        setPonto(p);
        document.title = `${p.nome} — RotaCerta`;
      })
      .catch(() => setErro('Ponto não encontrado.'));
    atualizar();
    // Atualiza sozinho; a previsão em minutos não precisa da frequência do mapa.
    const timer = setInterval(atualizar, ATUALIZAR_MS);
    return () => clearInterval(timer);
  }, [id, atualizar]);

  if (erro && !ponto) return <div className="pagina-texto"><p className="aviso-erro" role="alert">{erro}</p></div>;
  if (!ponto) return <div className="pagina-texto"><p>Carregando…</p></div>;

  return (
    <div className="pagina-texto">
      <p className="migalha"><Link to="/linhas">Linhas</Link> › Ponto</p>
      <h1 className="titulo-linha">
        {ponto.nome}
        <BotaoFavorito tipo="ponto" id={ponto.id} nome={`ponto ${ponto.nome}`} />
      </h1>
      <ul className="atributos">
        <li>{ponto.acessivel ? '♿ Ponto acessível' : 'Acessibilidade não informada'}</li>
        <li>{ponto.coberto ? 'Ponto coberto' : 'Ponto sem cobertura'}</li>
      </ul>
      <p>
        <Link to={`/planejar?origem=${ponto.id}`}>Planejar trajeto saindo daqui</Link>
        {' · '}
        <Link to={`/planejar?destino=${ponto.id}`}>Planejar trajeto até aqui</Link>
      </p>

      <div className="cabecalho-previsoes">
        <h2>Próximos ônibus</h2>
        <button type="button" className="botao-secundario" onClick={atualizar}>
          Atualizar
        </button>
      </div>
      {dados && (
        <p className="cartao-sub">
          Atualizado às {new Date(dados.atualizadoEm).toLocaleTimeString('pt-BR')} · atualiza sozinho a cada 15 segundos
        </p>
      )}
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <ul className="previsoes">
        {dados?.previsoes.map((g) => (
          <li key={`${g.linhaId}-${g.sentido}`} className="previsao">
            <Link to={`/linhas/${g.linhaId}`} className="previsao-linha">
              <span className="codigo-linha" style={{ background: g.cor }}>{g.codigo}</span>
              <span>
                <span className="cartao-titulo">Sentido {g.destino}</span>
                <span className="cartao-sub">{g.nome}</span>
              </span>
            </Link>

            {g.chegadas.length > 0 ? (
              <ol className="chegadas">
                {g.chegadas.map((c) => (
                  <li key={c.prefixo}>
                    <TextoChegada minutos={c.minutos} />
                    <span className="detalhe-chegada">
                      Ônibus {c.prefixo}
                      {c.acessivel ? ' · ♿ acessível' : ' · sem elevador'}
                    </span>
                    <SeloLotacao lotacao={c.lotacao} />
                    <InformarLotacao veiculoId={c.veiculoId} prefixo={c.prefixo} aoInformar={atualizar} />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="sem-onibus">
                {g.proximaPelaTabela
                  ? <>Sem ônibus em rota agora. Pela tabela, o próximo passa por volta das <strong>{g.proximaPelaTabela}</strong>.</>
                  : 'Não há mais ônibus hoje nesta linha.'}
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="nota">
        A previsão considera a posição atual de cada ônibus, a velocidade média da linha e o tempo
        parado nos pontos do caminho. Pode variar com o trânsito. A lotação é informada pelos próprios
        passageiros e vale por 20 minutos.
      </p>
    </div>
  );
}
