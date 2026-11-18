import { Router, type Response } from 'express';
import { z } from 'zod';
import { db } from '../db/conexao.js';
import { config } from '../config.js';
import {
  COOKIE_SESSAO, bloqueadoAte, buscarUsuario, conferirSenha, conferirSenhaFalsa,
  criarSessao, encerrarSessao, gerarHashSenha, limparErros, registrarErro, usuarioDaRequisicao,
} from '../services/auth.js';

export const rotasAuth = Router();

const cadastroSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome.').max(80),
  email: z.email('E-mail inválido.').trim().toLowerCase().max(120),
  senha: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(72), // bcrypt usa só 72 bytes
  aceite: z.literal(true, 'É preciso aceitar a política de privacidade.'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  senha: z.string(),
});

const preferenciasSchema = z.object({
  fonte: z.enum(['normal', 'grande', 'muito-grande']).optional(),
  altoContraste: z.boolean().optional(),
});

function enviarCookie(res: Response, token: string, expira: Date) {
  res.cookie(COOKIE_SESSAO, token, {
    httpOnly: true,                 // JavaScript da página não lê o cookie
    sameSite: 'lax',                // não é enviado em formulários de outros sites (CSRF)
    secure: config.NODE_ENV === 'production', // só via HTTPS em produção
    expires: expira,
    path: '/',
  });
}

const primeiraMensagem = (e: z.ZodError) => e.issues[0]?.message ?? 'Dados inválidos.';

// POST /api/auth/cadastro
rotasAuth.post('/cadastro', async (req, res) => {
  const dados = cadastroSchema.safeParse(req.body);
  if (!dados.success) return res.status(400).json({ erro: primeiraMensagem(dados.error) });
  const { nome, email, senha } = dados.data;

  if (db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(email)) {
    return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' });
  }

  const r = db
    .prepare(
      `INSERT INTO usuarios (nome, email, senha_hash, consentimento_em)
       VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
    )
    .run(nome, email, await gerarHashSenha(senha));

  const id = Number(r.lastInsertRowid);
  const { token, expira } = criarSessao(id);
  enviarCookie(res, token, expira);
  res.status(201).json({ usuario: buscarUsuario(id) });
});

// POST /api/auth/login
rotasAuth.post('/login', async (req, res) => {
  const dados = loginSchema.safeParse(req.body);
  if (!dados.success) return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  const { email, senha } = dados.data;

  const chave = `${req.ip}|${email}`;
  const ate = bloqueadoAte(chave);
  if (ate) {
    const min = Math.ceil((ate - Date.now()) / 60_000);
    return res.status(429).json({ erro: `Muitas tentativas. Tente de novo em ${min} min.` });
  }

  const linha = db.prepare('SELECT id, senha_hash FROM usuarios WHERE email = ?').get(email) as
    | { id: number; senha_hash: string }
    | undefined;
  const ok = linha ? await conferirSenha(senha, linha.senha_hash) : await conferirSenhaFalsa(senha);

  // Mesma mensagem para e-mail inexistente e senha errada: não revelamos
  // quais e-mails têm conta.
  if (!linha || !ok) {
    registrarErro(chave);
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }

  limparErros(chave);
  const { token, expira } = criarSessao(linha.id);
  enviarCookie(res, token, expira);
  res.json({ usuario: buscarUsuario(linha.id) });
});

// POST /api/auth/logout
rotasAuth.post('/logout', (req, res) => {
  const token = req.cookies?.[COOKIE_SESSAO];
  if (typeof token === 'string') encerrarSessao(token);
  res.clearCookie(COOKIE_SESSAO, { path: '/' });
  res.status(204).end();
});

// GET /api/auth/eu — quem está logado (ou null)
rotasAuth.get('/eu', (req, res) => {
  res.json({ usuario: usuarioDaRequisicao(req) });
});

// PUT /api/auth/preferencias — sincroniza fonte e contraste (RF07 + RF08)
rotasAuth.put('/preferencias', (req, res) => {
  const usuario = usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Entre na sua conta.' });
  const dados = preferenciasSchema.safeParse(req.body);
  if (!dados.success) return res.status(400).json({ erro: 'Preferências inválidas.' });
  const novas = { ...usuario.preferencias, ...dados.data };
  db.prepare('UPDATE usuarios SET preferencias = ? WHERE id = ?').run(JSON.stringify(novas), usuario.id);
  res.json({ preferencias: novas });
});

// GET /api/auth/meus-dados — LGPD art. 18: acesso e portabilidade dos dados
rotasAuth.get('/meus-dados', (req, res) => {
  const usuario = usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Entre na sua conta.' });
  const consentimento = db.prepare('SELECT consentimento_em FROM usuarios WHERE id = ?').get(usuario.id) as {
    consentimento_em: string;
  };
  const favoritos = db
    .prepare('SELECT tipo, ref_id AS id, criado_em AS criadoEm FROM favoritos WHERE usuario_id = ?')
    .all(usuario.id);
  const feedbacks = db
    .prepare('SELECT tipo, mensagem, status, criado_em AS criadoEm FROM feedbacks WHERE usuario_id = ?')
    .all(usuario.id);
  const relatosLotacao = (db.prepare('SELECT COUNT(*) AS n FROM lotacao_relatos WHERE usuario_id = ?').get(usuario.id) as { n: number }).n;
  res.setHeader('Content-Disposition', 'attachment; filename="meus-dados-rotacerta.json"');
  res.json({
    geradoEm: new Date().toISOString(),
    conta: { nome: usuario.nome, email: usuario.email, criadaEm: usuario.criadoEm, consentimentoEm: consentimento.consentimento_em },
    preferencias: usuario.preferencias,
    favoritos,
    feedbacks,
    relatosDeLotacao: relatosLotacao,
  });
});

// DELETE /api/auth/conta — LGPD art. 18: eliminação dos dados.
// ON DELETE CASCADE apaga junto as sessões e os favoritos.
rotasAuth.delete('/conta', (req, res) => {
  const usuario = usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Entre na sua conta.' });
  // As mensagens de feedback continuam (anônimas) para a equipe, mas o e-mail
  // de contato é apagado — senão sobraria um dado pessoal da conta excluída.
  db.exec('BEGIN');
  db.prepare('UPDATE feedbacks SET contato_email = NULL WHERE usuario_id = ?').run(usuario.id);
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(usuario.id);
  db.exec('COMMIT');
  res.clearCookie(COOKIE_SESSAO, { path: '/' });
  res.status(204).end();
});
