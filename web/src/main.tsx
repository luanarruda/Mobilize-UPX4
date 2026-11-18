import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProvedorAcessibilidade } from './contexto/Acessibilidade';
import { Layout } from './componentes/Layout';
import { PaginaMapa } from './paginas/PaginaMapa';
import './estilos.css';

const roteador = createBrowserRouter([
  {
    element: <Layout />,
    children: [{ path: '/', element: <PaginaMapa /> }],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProvedorAcessibilidade>
      <RouterProvider router={roteador} />
    </ProvedorAcessibilidade>
  </StrictMode>,
);
