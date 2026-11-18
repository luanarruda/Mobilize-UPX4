import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProvedorAcessibilidade } from './contexto/Acessibilidade';
import { Layout } from './componentes/Layout';
import { PaginaMapa } from './paginas/PaginaMapa';
import { PaginaLinhas } from './paginas/PaginaLinhas';
import { PaginaLinha } from './paginas/PaginaLinha';
import { PaginaPonto } from './paginas/PaginaPonto';
import { PaginaPlanejar } from './paginas/PaginaPlanejar';
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
      { path: '*', element: <NaoEncontrada /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProvedorAcessibilidade>
      <RouterProvider router={roteador} />
    </ProvedorAcessibilidade>
  </StrictMode>,
);
