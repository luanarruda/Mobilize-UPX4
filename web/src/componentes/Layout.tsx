import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { BarraAcessibilidade } from './BarraAcessibilidade';
import { IconeEstrela, IconeLinhas, IconeMapa, IconePessoa, IconeRota } from './Icones';
import { useSessao } from '../contexto/Sessao';

// No celular, só o rótulo curto aparece (o longo fica com display: none, então
// o leitor de tela também lê o curto: o nome falado é o mesmo que se vê).
const ITENS_MENU = [
  { para: '/', longo: 'Mapa ao vivo', curto: 'Mapa', Icone: IconeMapa, fim: true },
  { para: '/planejar', longo: 'Planejar trajeto', curto: 'Planejar', Icone: IconeRota, fim: false },
  { para: '/linhas', longo: 'Linhas e horários', curto: 'Linhas', Icone: IconeLinhas, fim: false },
  { para: '/favoritos', longo: 'Favoritos', curto: 'Favoritos', Icone: IconeEstrela, fim: false },
];

export function Layout() {
  // Ao trocar de página, leva o foco para o conteúdo: o leitor de tela
  // anuncia a nova página, como aconteceria num site tradicional.
  const { pathname } = useLocation();
  const principal = useRef<HTMLElement>(null);
  // Compara com o endereço anterior, em vez de "pular a primeira vez": em
  // desenvolvimento o React (StrictMode) roda os efeitos duas vezes, e a
  // segunda roubava o foco logo ao abrir o site — o 1º Tab pulava o
  // link "Pular para o conteúdo".
  const ultimoEndereco = useRef(pathname);
  const { usuario } = useSessao();
  useEffect(() => {
    if (ultimoEndereco.current === pathname) return;
    ultimoEndereco.current = pathname;
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
        {/* Um único menu: no computador fica no cabeçalho, só com texto; no
            celular vira uma barra fixa embaixo, com ícone e nome curto (CSS). */}
        <nav aria-label="Principal" className="menu-principal">
          <ul>
            {ITENS_MENU.map(({ para, longo, curto, Icone, fim }) => (
              <li key={para}>
                <NavLink to={para} end={fim}>
                  <Icone />
                  <span className="rotulo-longo">{longo}</span>
                  <span className="rotulo-curto">{curto}</span>
                </NavLink>
              </li>
            ))}
            <li>
              {usuario ? (
                <NavLink to="/conta" title={`Conectado como ${usuario.nome}`}>
                  <IconePessoa />
                  <span className="rotulo-longo">Minha conta</span>
                  <span className="rotulo-curto">Conta</span>
                </NavLink>
              ) : (
                <NavLink to="/entrar">
                  <IconePessoa />
                  <span>Entrar</span>
                </NavLink>
              )}
            </li>
          </ul>
        </nav>
        <BarraAcessibilidade />
      </header>
      <main id="conteudo" tabIndex={-1} ref={principal}>
        <Outlet />
      </main>
      <footer className="rodape">
        <span>RotaCerta · Projeto acadêmico Facens · Grupo Mobilize · 2026</span>
        <nav aria-label="Rodapé">
          <Link to="/feedback">Fale conosco</Link>
          <Link to="/privacidade">Privacidade</Link>
          {usuario?.papel === 'equipe' && <Link to="/equipe">Mensagens recebidas</Link>}
        </nav>
      </footer>
    </>
  );
}
