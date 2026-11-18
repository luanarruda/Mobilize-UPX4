import { Router } from 'express';
import { pool } from '../db/pool.js';

export const rotasPontos = Router();

// GET /api/pontos — todos os pontos com as linhas que passam em cada um
rotasPontos.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.nome, p.lat, p.lng, p.acessivel, p.coberto,
            COALESCE(array_agg(DISTINCT l.codigo) FILTER (WHERE l.id IS NOT NULL), '{}') AS linhas
       FROM pontos p
       LEFT JOIN linha_pontos lp ON lp.ponto_id = p.id
       LEFT JOIN linhas l ON l.id = lp.linha_id
      GROUP BY p.id ORDER BY p.nome`,
  );
  res.json(rows);
});
