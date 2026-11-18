// RF08 — Entrar e criar conta (conta é opcional: tudo funciona sem ela).
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSessao } from '../contexto/Sessao';
import { ErroApi } from '../api';

const DEMO = { email: 'demo@rotacerta.com.br', senha: 'rotacerta2026' };

export function PaginaEntrar({ modo }: { modo: 'entrar' | 'cadastro' }) {
  const { entrar, cadastrar, usuario } = useSessao();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const destino = params.get('voltar') ?? '/favoritos';

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const ids = { nome: useId(), email: useId(), senha: useId(), dica: useId(), aceite: useId() };

  useEffect(() => {
    document.title = `${modo === 'entrar' ? 'Entrar' : 'Criar conta'} — RotaCerta`;
  }, [modo]);

  useEffect(() => {
    if (usuario) navegar(destino, { replace: true });
  }, [usuario, navegar, destino]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      if (modo === 'entrar') await entrar(email, senha);
      else await cadastrar({ nome, email, senha, aceite });
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível conectar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pagina-texto pagina-estreita">
      <h1>{modo === 'entrar' ? 'Entrar' : 'Criar conta'}</h1>
      <p className="cartao-sub">
        A conta é opcional. Ela serve para levar seus favoritos e suas preferências de leitura para qualquer
        computador. Sem conta, eles ficam salvos só neste navegador.
      </p>

      {modo === 'entrar' && (
        <aside className="caixa-demo" aria-label="Conta de demonstração">
          <p>
            <strong>Conta de demonstração</strong>
            <br />
            E-mail: <code>{DEMO.email}</code>
            <br />
            Senha: <code>{DEMO.senha}</code>
          </p>
          <button type="button" className="botao-secundario" onClick={() => { setEmail(DEMO.email); setSenha(DEMO.senha); }}>
            Preencher
          </button>
        </aside>
      )}

      <form className="form-plano" onSubmit={enviar} noValidate>
        {modo === 'cadastro' && (
          <div className="campo">
            <label htmlFor={ids.nome}>Nome</label>
            <input id={ids.nome} className="entrada" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required />
          </div>
        )}
        <div className="campo">
          <label htmlFor={ids.email}>E-mail</label>
          <input id={ids.email} className="entrada" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="campo">
          <label htmlFor={ids.senha}>Senha</label>
          <div className="senha">
            <input
              id={ids.senha}
              className="entrada"
              type={verSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              // "new-password" faz o gerenciador de senhas do navegador sugerir uma senha forte.
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              aria-describedby={modo === 'cadastro' ? ids.dica : undefined}
              required
            />
            <button type="button" className="botao-secundario" aria-pressed={verSenha} onClick={() => setVerSenha(!verSenha)}>
              {verSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {modo === 'cadastro' && <p id={ids.dica} className="passo-sub">Pelo menos 8 caracteres.</p>}
        </div>

        {modo === 'cadastro' && (
          <label className="opcao" htmlFor={ids.aceite}>
            <input id={ids.aceite} type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
            <span>
              Li e aceito a <Link to="/privacidade" target="_blank">política de privacidade</Link>
              <span className="passo-sub">Guardamos só nome, e-mail, favoritos e preferências de leitura.</span>
            </span>
          </label>
        )}

        {erro && <p className="aviso-erro" role="alert">{erro}</p>}

        <button type="submit" className="botao-primario" disabled={enviando}>
          {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      <p>
        {modo === 'entrar' ? (
          <>Ainda não tem conta? <Link to={`/cadastro?voltar=${encodeURIComponent(destino)}`}>Criar conta</Link></>
        ) : (
          <>Já tem conta? <Link to={`/entrar?voltar=${encodeURIComponent(destino)}`}>Entrar</Link></>
        )}
      </p>
    </div>
  );
}
