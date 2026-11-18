import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { rotasLinhas } from './routes/linhas.js';
import { rotasPontos } from './routes/pontos.js';
import { rotasPlanejar } from './routes/planejar.js';
import { estado } from './realtime/estado.js';

export function criarApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/saude', (_req, res) => res.json({ ok: true, veiculos: estado.todas().length }));
  app.use('/api/linhas', rotasLinhas);
  app.use('/api/pontos', rotasPontos);
  app.use('/api/planejar', rotasPlanejar);
  app.get('/api/veiculos', (_req, res) => res.json(estado.todas()));

  // Tratador de erros central: nenhum erro de banco vaza detalhes internos ao usuário.
  const tratarErro: ErrorRequestHandler = (erro, _req, res, _next) => {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno. Tente novamente em instantes.' });
  };
  app.use(tratarErro);

  return app;
}
