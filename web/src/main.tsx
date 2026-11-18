import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProvedorAcessibilidade } from './contexto/Acessibilidade';
import { ProvedorSessao } from './contexto/Sessao';
import { ProvedorTempoReal } from './contexto/TempoReal';
import { ProvedorFavoritos } from './contexto/Favoritos';
import { Layout } from './componentes/Layout';
import { PaginaMapa } from './paginas/PaginaMapa';
import { PaginaLinhas } from './paginas/PaginaLinhas';
import { PaginaLinha } from './paginas/PaginaLinha';
import { PaginaPonto } from './paginas/PaginaPonto';
import { PaginaPlanejar } from './paginas/PaginaPlanejar';
import { PaginaFavoritos } from './paginas/PaginaFavoritos';
import { PaginaEntrar } from './paginas/PaginaEntrar';
import { PaginaConta } from './paginas/PaginaConta';
import { PaginaPrivacidade } from './paginas/PaginaPrivacidade';
import { PaginaFeedback } from './paginas/PaginaFeedback';
import { PaginaEquipe } from './paginas/PaginaEquipe';
import { PaginaImprimir } from './paginas/PaginaImprimir';
import { Link } from 'react-router-dom';

function NaoEncontrada() {
  return (
    <div className="pagina-texto">
      <h1>Página não encontrada</h1>
      <p><Link to="/">Voltar ao mapa</Link></p>
    </div>
  );
}
import './estilos.css';

const roteador = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <PaginaMapa /> },
      { path: '/linhas', element: <PaginaLinhas /> },
      { path: '/linhas/:id', element: <PaginaLinha /> },
      { path: '/pontos/:id', element: <PaginaPonto /> },
      { path: '/planejar', element: <PaginaPlanejar /> },
      { path: '/favoritos', element: <PaginaFavoritos /> },
      { path: '/entrar', element: <PaginaEntrar modo="entrar" /> },
      { path: '/cadastro', element: <PaginaEntrar modo="cadastro" /> },
      { path: '/conta', element: <PaginaConta /> },
      { path: '/privacidade', element: <PaginaPrivacidade /> },
      { path: '/feedback', element: <PaginaFeedback /> },
      { path: '/equipe', element: <PaginaEquipe /> },
      { path: '*', element: <NaoEncontrada /> },
    ],
  },
  // Fora do Layout: a página de impressão não leva cabeçalho nem menu.
  { path: '/linhas/:id/imprimir', element: <PaginaImprimir /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Ordem importa: acessibilidade e favoritos dependem da sessão. */}
    <ProvedorSessao>
      <ProvedorAcessibilidade>
        <ProvedorTempoReal>
          <ProvedorFavoritos>
            <RouterProvider router={roteador} />
          </ProvedorFavoritos>
        </ProvedorTempoReal>
      </ProvedorAcessibilidade>
    </ProvedorSessao>
  </StrictMode>,
);
