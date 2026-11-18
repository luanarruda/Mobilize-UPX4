import { Router, type NextFunction, type Request, type Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { config } from '../config.js';
import { catalogo } from '../services/catalogo.js';
import { avisos } from '../services/avisos.js';

export const rotasAvisos = Router();

// GET /api/avisos — avisos ativos (público)
rotasAvisos.get('/', (_req, res) => res.json(avisos.ativos()));

// Publicar e encerrar avisos exige a chave de administração no cabeçalho
// "x-chave-admin". timingSafeEqual compara em tempo constante, para o tempo de
// resposta não revelar quantos caracteres da chave estão certos.
function exigirAdmin(req: Request, res: Response, next: NextFunction) {
  const enviada = Buffer.from(String(req.headers['x-chave-admin'] ?? ''));
  const certa = Buffer.from(config.ADMIN_CHAVE);
  if (enviada.length !== certa.length || !timingSafeEqual(enviada, certa)) {
    return res.status(403).json({ erro: 'Chave de administração inválida.' });
  }
  next();
}

const novoAviso = z.object({
  linha: z.string().min(1),                       // código da linha, ex.: "201"
  tipo: z.enum(['atraso', 'desvio', 'interrupcao']),
  titulo: z.string().trim().min(3).max(80),
  mensagem: z.string().trim().min(3).max(400),
  horas: z.number().positive().max(24 * 90).optional(), // sem "horas": vale até ser encerrado
});

// POST /api/avisos — publica um aviso da operação
rotasAvisos.post('/', exigirAdmin, (req, res) => {
  const dados = novoAviso.safeParse(req.body);
  if (!dados.success) return res.status(400).json({ erro: dados.error.issues[0]?.message });
  const linha = catalogo.linhas().find((l) => l.codigo.toLowerCase() === dados.data.linha.toLowerCase());
  if (!linha) return res.status(404).json({ erro: `Linha ${dados.data.linha} não existe.` });
  avisos.publicar({ ...dados.data, linhaId: linha.id });
  res.status(201).json(avisos.ativos());
});

// DELETE /api/avisos/:id — encerra um aviso da operação (id numérico, sem o "op-")
rotasAvisos.delete('/:id', exigirAdmin, (req, res) => {
  const id = Number(String(req.params.id).replace(/^op-/, ''));
  if (!avisos.encerrar(id)) return res.status(404).json({ erro: 'Aviso não encontrado ou já encerrado.' });
  res.status(204).end();
});
