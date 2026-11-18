// RF06 — Favoritos de quem tem conta. Sem conta, os favoritos ficam só no
// navegador (localStorage); ao entrar, o front envia os locais para /importar.
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/conexao.js';
import { catalogo } from '../services/catalogo.js';
import { exigirLogin, type Usuario } from '../services/auth.js';

export const rotasFavoritos = Router();

rotasFavoritos.use(exigirLogin);

const item = z.object({ tipo: z.enum(['linha', 'ponto']), id: z.coerce.number().int().positive() });
type Item = z.infer<typeof item>;

const existe = ({ tipo, id }: Item) => (tipo === 'linha' ? !!catalogo.linha(id) : !!catalogo.ponto(id));

function listar(usuarioId: number) {
  return db
    .prepare('SELECT tipo, ref_id AS id FROM favoritos WHERE usuario_id = ? ORDER BY criado_em')
    .all(usuarioId) as Item[];
}

// GET /api/favoritos
rotasFavoritos.get('/', (_req, res) => {
  res.json(listar((res.locals.usuario as Usuario).id));
});

// PUT /api/favoritos/:tipo/:id — adiciona (repetir não dá erro: é idempotente)
rotasFavoritos.put('/:tipo/:id', (req, res) => {
  const dados = item.safeParse(req.params);
  if (!dados.success || !existe(dados.data)) return res.status(404).json({ erro: 'Linha ou ponto não encontrado.' });
  const u = res.locals.usuario as Usuario;
  db.prepare('INSERT OR IGNORE INTO favoritos (usuario_id, tipo, ref_id) VALUES (?, ?, ?)').run(u.id, dados.data.tipo, dados.data.id);
  res.json(listar(u.id));
});

// DELETE /api/favoritos/:tipo/:id
rotasFavoritos.delete('/:tipo/:id', (req, res) => {
  const dados = item.safeParse(req.params);
  if (!dados.success) return res.status(400).json({ erro: 'Favorito inválido.' });
  const u = res.locals.usuario as Usuario;
  db.prepare('DELETE FROM favoritos WHERE usuario_id = ? AND tipo = ? AND ref_id = ?').run(u.id, dados.data.tipo, dados.data.id);
  res.json(listar(u.id));
});

// POST /api/favoritos/importar — junta os favoritos do navegador aos da conta
rotasFavoritos.post('/importar', (req, res) => {
  const dados = z.object({ itens: z.array(item).max(200) }).safeParse(req.body);
  if (!dados.success) return res.status(400).json({ erro: 'Lista inválida.' });
  const u = res.locals.usuario as Usuario;
  const inserir = db.prepare('INSERT OR IGNORE INTO favoritos (usuario_id, tipo, ref_id) VALUES (?, ?, ?)');
  db.exec('BEGIN');
  for (const i of dados.data.itens.filter(existe)) inserir.run(u.id, i.tipo, i.id);
  db.exec('COMMIT');
  res.json(listar(u.id));
});
