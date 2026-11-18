import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type LinhaDetalhe, type Lotacao, type Ponto, type PosicaoVeiculo } from '../api';
import { SeloLotacao } from '../componentes/Lotacao';
import { useTempoReal } from '../contexto/TempoReal';
import { MapaFrota } from '../componentes/MapaFrota';

/** Próximo ponto do itinerário à frente do ônibus. */
function proximoPonto(linha: LinhaDetalhe, v: PosicaoVeiculo) {
  return linha.pontos.find((p) => p.distanciaM > v.distanciaNoTrajeto + 1) ?? linha.pontos[0];
}

const TEXTO_STATUS = {
  conectando: 'Conectando…',
  'ao-vivo': 'Ao vivo',
  reconectando: 'Conexão perdida. Tentando reconectar…',
};

export function PaginaMapa() {
  const [linhas, setLinhas] = useState<LinhaDetalhe[]>([]);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [visiveis, setVisiveis] = useState<Set<number>>(new Set());
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [lotacoes, setLotacoes] = useState<Record<string, Lotacao>>({});
  const { posicoes, status } = useTempoReal();

  useEffect(() => {
    (async () => {
      try {
        const resumo = await api.linhas();
        const [detalhes, listaPontos] = await Promise.all([
          Promise.all(resumo.map((l) => api.linha(l.id))),
          api.pontos(),
        ]);
        setLinhas(detalhes);
        setPontos(listaPontos);
        setVisiveis(new Set(detalhes.map((l) => l.id)));
      } catch {
        setErro('Não foi possível carregar as linhas. Verifique sua conexão e recarregue a página.');
      }
    })();
  }, []);

  // Lotação informada pelos passageiros (RF09): muda devagar, 30 s basta.
  useEffect(() => {
    const carregar = () => api.lotacao().then(setLotacoes).catch(() => {});
    carregar();
    const t = setInterval(carregar, 30_000);
    return () => clearInterval(t);
  }, []);

  const veiculos = useMemo(() => [...posicoes.values()], [posicoes]);
  const linhaSel = linhas.find((l) => l.id === selecionada) ?? null;

  const alternar = (id: number) =>
    setVisiveis((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });

  return (
    <div className="pagina-mapa">
      <aside className="painel" aria-labelledby="titulo-linhas">
        <div className="painel-topo">
          <h1 id="titulo-linhas">Linhas</h1>
          {/* aria-live: o leitor de tela anuncia quando a conexão cai ou volta. */}
          <p className={`status status-${status}`} role="status" aria-live="polite">
            <span className="bolinha" aria-hidden="true" />
            {TEXTO_STATUS[status]}
          </p>
        </div>

        {erro && <p className="aviso-erro" role="alert">{erro}</p>}

        <ul className="lista-linhas">
          {linhas.map((l) => {
            const emOperacao = veiculos.filter((v) => v.linhaId === l.id).length;
            const ativa = selecionada === l.id;
            return (
              <li key={l.id} className={ativa ? 'ativa' : undefined}>
                <label className="mostrar">
                  <input
                    type="checkbox"
                    checked={visiveis.has(l.id)}
                    onChange={() => alternar(l.id)}
                  />
                  <span className="visualmente-oculto">Mostrar linha {l.codigo} no mapa</span>
                </label>
                <button
                  type="button"
                  className="botao-linha"
                  aria-expanded={ativa}
                  onClick={() => setSelecionada(ativa ? null : l.id)}
                >
                  <span className="codigo" style={{ background: l.cor }}>{l.codigo}</span>
                  <span className="nome">{l.nome}</span>
                  <span className="qtd">
                    {emOperacao} em operação
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {linhaSel && (
          <section className="detalhe-linha" aria-labelledby="titulo-detalhe">
            <h2 id="titulo-detalhe">
              Linha {linhaSel.codigo} agora
            </h2>
            <p><Link to={`/linhas/${linhaSel.id}`}>Ver itinerário e horários da linha {linhaSel.codigo}</Link></p>
            <table>
              <caption className="visualmente-oculto">
                Ônibus da linha {linhaSel.codigo} em operação
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ônibus</th>
                  <th scope="col">Próximo ponto</th>
                  <th scope="col">Velocidade</th>
                  <th scope="col">Lotação</th>
                </tr>
              </thead>
              <tbody>
                {veiculos
                  .filter((v) => v.linhaId === linhaSel.id)
                  .map((v) => {
                    const prox = proximoPonto(linhaSel, v);
                    return (
                      <tr key={v.veiculoId}>
                        <td>
                          {v.prefixo}
                          {v.acessivel && (
                            <span className="tag-acessivel" title="Ônibus com acessibilidade">
                              <span aria-hidden="true"> ♿</span>
                              <span className="visualmente-oculto"> (acessível)</span>
                            </span>
                          )}
                        </td>
                        <td>
                          {prox.nome}
                          <span className="sentido"> ({prox.sentido})</span>
                        </td>
                        <td>{v.velocidadeKmh === 0 ? 'Parado no ponto' : `${v.velocidadeKmh} km/h`}</td>
                        <td><SeloLotacao lotacao={lotacoes[v.veiculoId] ?? null} compacto /></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </section>
        )}

        <p className="legenda">
          <span className="leg-ponto acessivel" aria-hidden="true" /> Ponto acessível
          <span className="leg-ponto" aria-hidden="true" /> Ponto comum
          <br />
          <small>Dados de demonstração — linhas e trajetos aproximados.</small>
        </p>
      </aside>

      <section className="area-mapa" aria-label="Mapa">
        <MapaFrota
          linhas={linhas}
          pontos={pontos}
          veiculos={veiculos}
          visiveis={visiveis}
          selecionada={selecionada}
        />
      </section>
    </div>
  );
}
