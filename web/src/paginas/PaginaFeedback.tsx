// RF10 — Canal de feedback: sugestões, elogios e relatos de problemas.
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ErroApi, type TipoFeedback } from '../api';
import { useSessao } from '../contexto/Sessao';
import { useFavoritos } from '../contexto/Favoritos';

const TIPOS: { valor: TipoFeedback; nome: string; dica: string }[] = [
  { valor: 'problema', nome: 'Relatar um problema', dica: 'Previsão errada, ponto danificado, erro no site…' },
  { valor: 'sugestao', nome: 'Sugestão', dica: 'Uma ideia para melhorar o RotaCerta ou o transporte.' },
  { valor: 'elogio', nome: 'Elogio', dica: 'Algo que funcionou bem.' },
];
const MAX = 1000;

export function PaginaFeedback() {
  const { usuario } = useSessao();
  const { linhas } = useFavoritos();
  const [params] = useSearchParams();
  const [tipo, setTipo] = useState<TipoFeedback | ''>('');
  const [mensagem, setMensagem] = useState('');
  const [linhaId, setLinhaId] = useState(params.get('linha') ?? '');
  const [email, setEmail] = useState('');
  const [site, setSite] = useState(''); // honeypot (ver server/src/routes/feedback.ts)
  const [erro, setErro] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const ids = { msg: useId(), contador: useId(), linha: useId(), email: useId(), tipo: useId() };

  useEffect(() => {
    document.title = 'Fale conosco — RotaCerta';
  }, []);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!tipo) return setErro('Escolha o tipo da mensagem.');
    setErro(null);
    setEnviando(true);
    try {
      const r = await api.enviarFeedback({ tipo, mensagem, linhaId: linhaId ? Number(linhaId) : null, email, site });
      setProtocolo(r.protocolo);
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível enviar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  if (protocolo !== null) {
    return (
      <div className="pagina-texto pagina-estreita">
        <h1>Mensagem enviada</h1>
        {/* role="status": o leitor de tela anuncia a confirmação. */}
        <p role="status">
          Obrigado! Recebemos sua mensagem{protocolo > 0 && <> com o protocolo <strong>#{protocolo}</strong></>}.
        </p>
        <p><Link to="/">Voltar ao mapa</Link></p>
      </div>
    );
  }

  return (
    <div className="pagina-texto pagina-estreita">
      <h1>Fale conosco</h1>
      <p className="cartao-sub">Sua mensagem vai para a equipe do RotaCerta. Não é preciso ter conta.</p>

      <form className="form-plano" onSubmit={enviar} noValidate>
        <fieldset className="grupo-radio">
          <legend>Sobre o que você quer falar?</legend>
          {TIPOS.map((t) => (
            <label key={t.valor} className={`opcao-radio${tipo === t.valor ? ' marcada' : ''}`}>
              <input type="radio" name={ids.tipo} value={t.valor} checked={tipo === t.valor} onChange={() => setTipo(t.valor)} />
              <span>
                {t.nome}
                <span className="passo-sub">{t.dica}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="campo">
          <label htmlFor={ids.linha}>Linha relacionada (opcional)</label>
          <select id={ids.linha} value={linhaId} onChange={(e) => setLinhaId(e.target.value)}>
            <option value="">Nenhuma linha específica</option>
            {linhas.map((l) => <option key={l.id} value={l.id}>{l.codigo} — {l.nome}</option>)}
          </select>
        </div>

        <div className="campo">
          <label htmlFor={ids.msg}>Mensagem</label>
          <textarea
            id={ids.msg}
            className="entrada area-texto"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value.slice(0, MAX))}
            rows={6}
            aria-describedby={ids.contador}
            required
          />
          <p id={ids.contador} className="passo-sub">{mensagem.length} de {MAX} caracteres (mínimo 10)</p>
        </div>

        {!usuario && (
          <div className="campo">
            <label htmlFor={ids.email}>Seu e-mail, se quiser resposta (opcional)</label>
            <input id={ids.email} className="entrada" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
        )}
        {usuario && <p className="passo-sub">Se precisarmos responder, usaremos o e-mail da sua conta ({usuario.email}).</p>}

        {/* Honeypot: escondido de pessoas (visual e leitor de tela), visível para robôs. */}
        <div className="pote-de-mel" aria-hidden="true">
          <label>Não preencha este campo<input tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} /></label>
        </div>

        {erro && <p className="aviso-erro" role="alert">{erro}</p>}
        <button type="submit" className="botao-primario" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar mensagem'}</button>
      </form>
    </div>
  );
}
