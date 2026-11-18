import express, { type ErrorRequestHandler } from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import { rotasLinhas } from './routes/linhas.js';
import { rotasPontos } from './routes/pontos.js';
import { rotasPlanejar } from './routes/planejar.js';
import { rotasAuth } from './routes/auth.js';
import { rotasFavoritos } from './routes/favoritos.js';
import { rotasLotacao } from './routes/lotacao.js';
import { rotasFeedback } from './routes/feedback.js';
import { estado } from './realtime/estado.js';

export function criarApp() {
  const app = express();
  // Sem cors(): o site e a API ficam na mesma origem (o Vite faz o proxy em
  // desenvolvimento). Bloquear outras origens dificulta ataques com cookies.
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());

  app.get('/api/saude', (_req, res) => res.json({ ok: true, veiculos: estado.todas().length }));
  app.use('/api/linhas', rotasLinhas);
  app.use('/api/pontos', rotasPontos);
  app.use('/api/planejar', rotasPlanejar);
  app.use('/api/auth', rotasAuth);
  app.use('/api/favoritos', rotasFavoritos);
  app.use('/api/lotacao', rotasLotacao);
  app.use('/api/feedback', rotasFeedback);
  app.get('/api/veiculos', (_req, res) => res.json(estado.todas()));

  // Rotas /api que não existem respondem 404 em JSON (e não com o site).
  app.use('/api', (_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

  // Depois de `npm run build`, a própria API entrega o site compilado
  // (web/dist). Assim, na apresentação, um único comando (`npm start`) sobe
  // tudo, sem o servidor de desenvolvimento do Vite.
  const pastaSite = fileURLToPath(new URL('../../web/dist', import.meta.url));
  if (existsSync(pastaSite)) {
    app.use(express.static(pastaSite));
    // Qualquer outro endereço (/linhas/2, /favoritos…) devolve o index.html e
    // o React Router decide a tela — é assim que um "single page app" funciona.
    app.get('/{*caminho}', (_req, res) => res.sendFile(`${pastaSite}/index.html`));
  }

  // Tratador de erros central: nenhum erro de banco vaza detalhes internos ao usuário.
  const tratarErro: ErrorRequestHandler = (erro, _req, res, _next) => {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno. Tente novamente em instantes.' });
  };
  app.use(tratarErro);

  return app;
}
