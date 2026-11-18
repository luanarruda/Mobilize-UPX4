// RF08 — Minha conta, com os direitos da LGPD: ver, baixar e excluir os dados.
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSessao } from '../contexto/Sessao';
import { useAcessibilidade } from '../contexto/Acessibilidade';

export function PaginaConta() {
  const { usuario, carregando, sair, excluirConta } = useSessao();
  const { fonte, altoContraste } = useAcessibilidade();
  const navegar = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Minha conta — RotaCerta';
  }, []);

  if (carregando) return <div className="pagina-texto"><p>Carregando…</p></div>;
  if (!usuario) return <Navigate to="/entrar?voltar=/conta" replace />;

  const fazerSair = async () => {
    await sair();
    navegar('/');
  };

  const excluir = async () => {
    try {
      await excluirConta();
      navegar('/');
    } catch {
      setErro('Não foi possível excluir a conta. Tente de novo.');
    }
  };

  const nomesFonte = { normal: 'normal', grande: 'grande (A+)', 'muito-grande': 'muito grande (A++)' };

  return (
    <div className="pagina-texto pagina-estreita">
      <h1>Minha conta</h1>
      <dl className="dados-conta">
        <dt>Nome</dt><dd>{usuario.nome}</dd>
        <dt>E-mail</dt><dd>{usuario.email}</dd>
        <dt>Conta criada em</dt><dd>{new Date(usuario.criadoEm).toLocaleDateString('pt-BR')}</dd>
        <dt>Preferências de leitura</dt>
        <dd>Texto {nomesFonte[fonte]}{altoContraste ? ', alto contraste' : ''}. Salvas na conta e aplicadas sempre que você entrar.</dd>
      </dl>

      <div className="acoes">
        <button type="button" className="botao-secundario" onClick={fazerSair}>Sair</button>
      </div>

      <section className="bloco" aria-labelledby="titulo-dados">
        <h2 id="titulo-dados">Seus dados (LGPD)</h2>
        <p>
          Você pode baixar uma cópia de tudo o que guardamos sobre você, ou excluir a conta. A exclusão apaga
          também seus favoritos e preferências e não pode ser desfeita.
        </p>
        <div className="acoes">
          {/* Link direto: o navegador baixa o arquivo JSON usando o cookie de sessão. */}
          <a className="botao-secundario como-botao" href="/api/auth/meus-dados" download>
            Baixar meus dados
          </a>
          {!confirmando ? (
            <button type="button" className="botao-perigo" onClick={() => setConfirmando(true)}>
              Excluir minha conta
            </button>
          ) : (
            // Confirmação na própria página (em vez de window.confirm), legível e acessível por teclado.
            <div className="confirmacao" role="group" aria-label="Confirmar exclusão">
              <p><strong>Tem certeza?</strong> Isso apaga sua conta e seus favoritos para sempre.</p>
              <button type="button" className="botao-perigo" onClick={excluir}>Sim, excluir</button>
              <button type="button" className="botao-secundario" onClick={() => setConfirmando(false)} autoFocus>
                Cancelar
              </button>
            </div>
          )}
        </div>
        {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      </section>
    </div>
  );
}
