// RF04 — Planejador de trajetos com baldeação.
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type Itinerario, type Ponto, type ResultadoPlano, type Trecho } from '../api';
import { MapaPlano } from '../componentes/MapaPlano';
import { distanciaM, duracao, relogio } from '../util';

function Passo({ t, base }: { t: Trecho; base: string }) {
  if (t.tipo === 'caminhada') {
    return (
      <li className="passo passo-caminhada">
        <strong>Caminhe {t.distanciaM} m</strong> até <Link to={`/pontos/${t.paraId}`}>{t.para}</Link>
        <span className="passo-sub">cerca de {duracao(t.chegadaS - t.partidaS)}</span>
      </li>
    );
  }
  return (
    <li className="passo" style={{ ['--cor' as string]: t.cor }}>
      <span className="codigo-linha" style={{ background: t.cor }}>{t.codigo}</span>
      <div>
        <p>
          Em <Link to={`/pontos/${t.embarqueId}`}>{t.embarque}</Link>, pegue a linha{' '}
          <strong>{t.codigo}</strong> sentido <strong>{t.destino}</strong>.
        </p>
        <p className="passo-sub">
          Ônibus {t.prefixo}
          {t.acessivel ? ' (♿ acessível)' : ' (sem elevador)'} passa {t.esperaS < 60 ? 'agora' : `em ${duracao(t.esperaS)}`},
          às {relogio(base, t.partidaS)}.
        </p>
        <p>
          Desça em <Link to={`/pontos/${t.desembarqueId}`}>{t.desembarque}</Link>{' '}
          <span className="passo-sub">
            após {t.paradas} {t.paradas === 1 ? 'ponto' : 'pontos'} · {duracao(t.chegadaS - t.partidaS)} de viagem · às {relogio(base, t.chegadaS)}
          </span>
        </p>
      </div>
    </li>
  );
}

function Resumo({ it, base }: { it: Itinerario; base: string }) {
  const linhas = it.trechos.filter((t) => t.tipo === 'onibus');
  return (
    <>
      <span className="resumo-tempo">{duracao(it.chegadaS)}</span>
      <span className="resumo-sub">
        chega às {relogio(base, it.chegadaS)} ·{' '}
        {it.baldeacoes === 0 ? 'direto' : `${it.baldeacoes} ${it.baldeacoes === 1 ? 'baldeação' : 'baldeações'}`}
      </span>
      <span className="resumo-linhas" aria-hidden="true">
        {linhas.map((t, i) => (
          <span key={i}>
            {i > 0 && ' › '}
            <span className="codigo-linha mini" style={{ background: t.cor }}>{t.codigo}</span>
          </span>
        ))}
      </span>
      {/* Versão para leitor de tela do resumo das linhas acima. */}
      <span className="visualmente-oculto">Linhas {linhas.map((t) => t.codigo).join(', depois ')}.</span>
    </>
  );
}

export function PaginaPlanejar() {
  const [params, setParams] = useSearchParams();
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [origem, setOrigem] = useState(params.get('origem') ?? '');
  const [destino, setDestino] = useState(params.get('destino') ?? '');
  const [acessivel, setAcessivel] = useState(params.get('acessivel') === '1');
  const [resultado, setResultado] = useState<ResultadoPlano | null>(null);
  const [escolhido, setEscolhido] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const ids = { origem: useId(), destino: useId(), acessivel: useId() };

  useEffect(() => {
    api.pontos().then(setPontos).catch(() => setMensagem('Não foi possível carregar os pontos.'));
  }, []);

  // A busca acontece quando a URL muda: assim o trajeto pode ser compartilhado
  // por link e o botão "voltar" do navegador funciona.
  useEffect(() => {
    const o = Number(params.get('origem'));
    const d = Number(params.get('destino'));
    if (!o || !d) return;
    setCarregando(true);
    setMensagem(null);
    api
      .planejar(o, d, params.get('acessivel') === '1')
      .then((r) => {
        setResultado(r);
        setEscolhido(0);
        if (r.itinerarios.length === 0) {
          setMensagem('Não encontramos trajeto com os ônibus em operação agora. Tente outro ponto próximo ou desmarque a opção de acessibilidade.');
        }
      })
      .catch(() => setMensagem('Não foi possível calcular o trajeto. Verifique os pontos escolhidos.'))
      .finally(() => setCarregando(false));
  }, [params]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!origem || !destino) return setMensagem('Escolha a origem e o destino.');
    if (origem === destino) return setMensagem('A origem e o destino precisam ser diferentes.');
    setParams({ origem, destino, ...(acessivel ? { acessivel: '1' } : {}) });
  };

  const inverter = () => {
    setOrigem(destino);
    setDestino(origem);
  };

  const usarLocalizacao = () => {
    if (!('geolocation' in navigator)) return setAviso('Seu navegador não permite obter a localização.');
    setAviso('Obtendo sua localização…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const maisProximo = pontos
          .map((p) => ({ p, m: distanciaM([coords.latitude, coords.longitude], [p.lat, p.lng]) }))
          .sort((a, b) => a.m - b.m)[0];
        if (!maisProximo) return;
        setOrigem(String(maisProximo.p.id));
        setAviso(
          maisProximo.m > 3000
            ? `Você parece estar longe da área atendida. Selecionamos o ponto mais próximo: ${maisProximo.p.nome}.`
            : `Ponto mais próximo: ${maisProximo.p.nome}, a ${Math.round(maisProximo.m)} m.`,
        );
      },
      () => setAviso('Não foi possível obter sua localização. Verifique a permissão do navegador.'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const porId = useMemo(() => new Map(pontos.map((p) => [String(p.id), p])), [pontos]);
  const itinerario = resultado?.itinerarios[escolhido];

  const opcoesPontos = pontos.map((p) => (
    <option key={p.id} value={p.id}>
      {p.nome}{p.acessivel ? ' (acessível)' : ''}
    </option>
  ));

  return (
    <div className="pagina-linha">
      <div className="pagina-texto">
        <h1>Planejar trajeto</h1>

        <form className="form-plano" onSubmit={enviar}>
          <div className="campo">
            <label htmlFor={ids.origem}>De onde você sai?</label>
            <select id={ids.origem} value={origem} onChange={(e) => setOrigem(e.target.value)} required>
              <option value="">Escolha o ponto de origem</option>
              {opcoesPontos}
            </select>
            <button type="button" className="botao-link" onClick={usarLocalizacao}>
              Usar o ponto mais próximo de mim
            </button>
            <p className="passo-sub" role="status" aria-live="polite">{aviso}</p>
          </div>

          <button type="button" className="botao-secundario inverter" onClick={inverter} aria-label="Inverter origem e destino">
            ⇅ Inverter
          </button>

          <div className="campo">
            <label htmlFor={ids.destino}>Para onde você vai?</label>
            <select id={ids.destino} value={destino} onChange={(e) => setDestino(e.target.value)} required>
              <option value="">Escolha o ponto de destino</option>
              {opcoesPontos}
            </select>
          </div>

          <label className="opcao" htmlFor={ids.acessivel}>
            <input id={ids.acessivel} type="checkbox" checked={acessivel} onChange={(e) => setAcessivel(e.target.checked)} />
            <span>
              Preciso de acessibilidade
              <span className="passo-sub">Só ônibus com elevador, baldeação em pontos acessíveis e sem trechos a pé.</span>
            </span>
          </label>

          <button type="submit" className="botao-primario" disabled={carregando}>
            {carregando ? 'Calculando…' : 'Ver trajetos'}
          </button>
        </form>

        {mensagem && <p className="aviso-erro" role="alert">{mensagem}</p>}

        {resultado && resultado.itinerarios.length > 0 && (
          <section aria-labelledby="titulo-opcoes" className="bloco">
            <h2 id="titulo-opcoes">
              {resultado.itinerarios.length === 1 ? '1 opção encontrada' : `${resultado.itinerarios.length} opções encontradas`}
            </h2>
            <ul className="opcoes-plano">
              {resultado.itinerarios.map((it, i) => (
                <li key={i}>
                  <button type="button" aria-pressed={i === escolhido} onClick={() => setEscolhido(i)}>
                    <Resumo it={it} base={resultado.calculadoEm} />
                  </button>
                </li>
              ))}
            </ul>

            {itinerario && (
              <>
                <h2>Passo a passo</h2>
                <ol className="passos">
                  {itinerario.trechos.map((t, i) => <Passo key={i} t={t} base={resultado.calculadoEm} />)}
                  <li className="passo passo-fim">
                    <strong>Chegada</strong> em {porId.get(params.get('destino') ?? '')?.nome} às{' '}
                    {relogio(resultado.calculadoEm, itinerario.chegadaS)}
                  </li>
                </ol>
                <p className="nota">
                  Horários estimados com a posição atual dos ônibus, calculados às{' '}
                  {new Date(resultado.calculadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
                  Para atualizar, clique em "Ver trajetos" de novo.
                </p>
              </>
            )}
          </section>
        )}
      </div>

      <section className="mapa-linha" aria-label="Mapa do trajeto">
        <MapaPlano
          origem={porId.get(params.get('origem') ?? origem)}
          destino={porId.get(params.get('destino') ?? destino)}
          itinerario={itinerario}
        />
      </section>
    </div>
  );
}
