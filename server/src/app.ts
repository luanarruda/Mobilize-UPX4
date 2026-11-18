import express, { type ErrorRequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import { rotasLinhas } from './routes/linhas.js';
import { rotasPontos } from './routes/pontos.js';
import { rotasPlanejar } from './routes/planejar.js';
import { rotasAuth } from './routes/auth.js';
import { rotasFavoritos } from './routes/favoritos.js';
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
  app.get('/api/veiculos', (_req, res) => res.json(estado.todas()));

  // Tratador de erros central: nenhum erro de banco vaza detalhes internos ao usuário.
  const tratarErro: ErrorRequestHandler = (erro, _req, res, _next) => {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno. Tente novamente em instantes.' });
  };
  app.use(tratarErro);

  return app;
}
