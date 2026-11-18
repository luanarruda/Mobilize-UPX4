import { NavLink, Outlet } from 'react-router-dom';
import { BarraAcessibilidade } from './BarraAcessibilidade';

export function Layout() {
  return (
    <>
      {/* Link "pular para o conteúdo": quem navega por teclado ou leitor de tela
          não precisa passar por todo o cabeçalho em cada página. */}
      <a className="pular-conteudo" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="cabecalho">
        <a href="/" className="marca" aria-label="RotaCerta, página inicial">
          <img src="/favicon.svg" alt="" width={36} height={36} />
          <span>RotaCerta</span>
        </a>
        <nav aria-label="Principal">
          <ul>
            <li><NavLink to="/" end>Mapa ao vivo</NavLink></li>
          </ul>
        </nav>
        <BarraAcessibilidade />
      </header>
      <main id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
