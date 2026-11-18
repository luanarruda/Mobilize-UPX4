// RF10 — Canal de feedback: sugestões, elogios e relatos de problemas.
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/conexao.js';
import { dentroDoLimite, exigirEquipe, usuarioDaRequisicao } from '../services/auth.js';
import { catalogo } from '../services/catalogo.js';

export const rotasFeedback = Router();

const novoFeedback = z.object({
  tipo: z.enum(['sugestao', 'elogio', 'problema'], 'Escolha o tipo da mensagem.'),
  mensagem: z.string().trim().min(10, 'Escreva pelo menos 10 caracteres.').max(1000, 'Use no máximo 1.000 caracteres.'),
  linhaId: z.number().int().positive().nullable().optional(),
  email: z.union([z.email('E-mail inválido.'), z.literal('')]).optional(),
  // "Pote de mel" (honeypot): campo escondido que pessoas não veem nem
  // preenchem, mas robôs de spam preenchem tudo. Se vier preenchido, é robô.
  site: z.string().optional(),
});

// POST /api/feedback — qualquer pessoa pode enviar, com ou sem conta.
rotasFeedback.post('/', (req, res) => {
  const dados = novoFeedback.safeParse(req.body);
  if (!dados.success) return res.status(400).json({ erro: dados.error.issues[0]?.message ?? 'Dados inválidos.' });
  const { tipo, mensagem, linhaId, email, site } = dados.data;

  // Para o robô, parece que deu certo; mas nada é gravado.
  if (site) return res.status(201).json({ protocolo: 0 });

  if (!dentroDoLimite(`feedback|${req.ip}`, 5, 60 * 60_000)) {
    return res.status(429).json({ erro: 'Você enviou muitas mensagens na última hora. Tente mais tarde.' });
  }
  if (linhaId && !catalogo.linha(linhaId)) return res.status(400).json({ erro: 'Linha inválida.' });

  const usuario = usuarioDaRequisicao(req);
  const contato = email || usuario?.email || null;
  const r = db
    .prepare('INSERT INTO feedbacks (tipo, mensagem, linha_id, contato_email, usuario_id) VALUES (?, ?, ?, ?, ?)')
    .run(tipo, mensagem, linhaId ?? null, contato, usuario?.id ?? null);
  res.status(201).json({ protocolo: Number(r.lastInsertRowid) });
});

// GET /api/feedback?status=novo — só a equipe
rotasFeedback.get('/', exigirEquipe, (req, res) => {
  const status = z.enum(['novo', 'lido', 'resolvido']).optional().safeParse(req.query.status);
  const filtro = status.success ? status.data : undefined;
  const linhas = db
    .prepare(
      `SELECT f.id, f.tipo, f.mensagem, f.contato_email AS email, f.status, f.criado_em AS criadoEm,
              l.codigo AS linha
         FROM feedbacks f LEFT JOIN linhas l ON l.id = f.linha_id
        WHERE (? IS NULL OR f.status = ?)
        ORDER BY f.criado_em DESC LIMIT 200`,
    )
    .all(filtro ?? null, filtro ?? null);
  const contagem = db.prepare('SELECT status, COUNT(*) AS n FROM feedbacks GROUP BY status').all() as {
    status: string; n: number;
  }[];
  res.json({ feedbacks: linhas, contagem: Object.fromEntries(contagem.map((c) => [c.status, c.n])) });
});

// PATCH /api/feedback/:id — a equipe marca como lido ou resolvido
rotasFeedback.patch('/:id', exigirEquipe, (req, res) => {
  const status = z.object({ status: z.enum(['novo', 'lido', 'resolvido']) }).safeParse(req.body);
  if (!status.success) return res.status(400).json({ erro: 'Status inválido.' });
  const r = db.prepare('UPDATE feedbacks SET status = ? WHERE id = ?').run(status.data.status, Number(req.params.id));
  if (r.changes === 0) return res.status(404).json({ erro: 'Mensagem não encontrada.' });
  res.status(204).end();
});
