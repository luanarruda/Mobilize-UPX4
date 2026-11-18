import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { estado } from '../realtime/estado.js';

export const rotasLinhas = Router();

// GET /api/linhas — lista resumida (sem o trajeto, que é pesado)
rotasLinhas.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, codigo, nome, cor, empresa FROM linhas ORDER BY codigo',
  );
  res.json(rows);
});

// GET /api/linhas/:id — detalhes: trajeto e pontos em ordem
rotasLinhas.get('/:id', async (req, res) => {
  const id = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ erro: 'id inválido' });

  const { rows } = await pool.query(
    'SELECT id, codigo, nome, cor, empresa, trajeto FROM linhas WHERE id = $1',
    [id.data],
  );
  if (rows.length === 0) return res.status(404).json({ erro: 'Linha não encontrada' });

  const { rows: pontos } = await pool.query(
    `SELECT lp.ordem, lp.sentido, lp.distancia_m AS "distanciaM",
            p.id, p.nome, p.lat, p.lng, p.acessivel, p.coberto
       FROM linha_pontos lp JOIN pontos p ON p.id = lp.ponto_id
      WHERE lp.linha_id = $1 ORDER BY lp.ordem`,
    [id.data],
  );
  res.json({ ...rows[0], pontos });
});

// GET /api/linhas/:id/veiculos — posições atuais só desta linha
rotasLinhas.get('/:id/veiculos', (req, res) => {
  res.json(estado.daLinha(Number(req.params.id)));
});
