import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { BarraAcessibilidade } from './BarraAcessibilidade';
import { useSessao } from '../contexto/Sessao';

export function Layout() {
  // Ao trocar de página, leva o foco para o conteúdo: o leitor de tela
  // anuncia a nova página, como aconteceria num site tradicional.
  const { pathname } = useLocation();
  const principal = useRef<HTMLElement>(null);
  const primeiraVez = useRef(true);
  const { usuario } = useSessao();
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    principal.current?.focus();
  }, [pathname]);

  return (
    <>
      {/* Link "pular para o conteúdo": quem navega por teclado ou leitor de tela
          não precisa passar por todo o cabeçalho em cada página. */}
      <a className="pular-conteudo" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="cabecalho">
        <Link to="/" className="marca" aria-label="RotaCerta, página inicial">
          <img src="/favicon.svg" alt="" width={36} height={36} />
          <span>RotaCerta</span>
        </Link>
        <nav aria-label="Principal">
          <ul>
            <li><NavLink to="/" end>Mapa ao vivo</NavLink></li>
            <li><NavLink to="/planejar">Planejar trajeto</NavLink></li>
            <li><NavLink to="/linhas">Linhas e horários</NavLink></li>
            <li><NavLink to="/favoritos">Favoritos</NavLink></li>
            <li>
              {usuario ? (
                <NavLink to="/conta" title={`Conectado como ${usuario.nome}`}>Minha conta</NavLink>
              ) : (
                <NavLink to="/entrar">Entrar</NavLink>
              )}
            </li>
          </ul>
        </nav>
        <BarraAcessibilidade />
      </header>
      <main id="conteudo" tabIndex={-1} ref={principal}>
        <Outlet />
      </main>
    </>
  );
}
