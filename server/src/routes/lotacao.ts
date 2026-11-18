import { Router } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db } from '../db/conexao.js';
import { dentroDoLimite, usuarioDaRequisicao } from '../services/auth.js';
import { lotacaoAtual, registrarRelato } from '../services/lotacao.js';

export const rotasLotacao = Router();

// GET /api/lotacao — { [veiculoId]: { nivel, relatos, atualizadoEm } }
rotasLotacao.get('/', (_req, res) => {
  res.json(Object.fromEntries(lotacaoAtual()));
});

const relato = z.object({
  veiculoId: z.number().int().positive(),
  nivel: z.number().int().min(0).max(3),
  // Identificador anônimo sorteado pelo navegador e guardado no localStorage.
  autor: z.string().min(8).max(64),
});

// POST /api/lotacao — um passageiro informa a lotação de um ônibus.
// Não exige conta: quanto menos atrito, mais gente informa.
rotasLotacao.post('/', (req, res) => {
  const dados = relato.safeParse(req.body);
  if (!dados.success) return res.status(400).json({ erro: 'Relato inválido.' });
  const { veiculoId, nivel, autor } = dados.data;

  if (!db.prepare('SELECT 1 FROM veiculos WHERE id = ?').get(veiculoId)) {
    return res.status(404).json({ erro: 'Ônibus não encontrado.' });
  }
  // No máximo 10 relatos a cada 10 minutos por pessoa: evita "spam" que
  // distorça a informação para os outros passageiros.
  if (!dentroDoLimite(`lotacao|${autor}|${req.ip}`, 10, 10 * 60_000)) {
    return res.status(429).json({ erro: 'Você enviou muitos relatos. Tente de novo em alguns minutos.' });
  }

  // Guardamos só o hash do identificador: no banco não fica nada que ligue o
  // relato ao navegador da pessoa (LGPD: coleta mínima).
  const autorHash = createHash('sha256').update(autor).digest('hex');
  const usuario = usuarioDaRequisicao(req);
  const lotacao = registrarRelato(veiculoId, nivel, autorHash, usuario?.id ?? null);
  res.status(201).json({ veiculoId, lotacao });
});
