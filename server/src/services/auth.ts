// RF08 — Contas de usuário: senhas, sessões e proteção contra força bruta.
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import { db } from '../db/conexao.js';

// ---------------------------------------------------------------------------
// SENHAS — bcrypt
//
// Nunca guardamos a senha, só um "hash": o resultado de uma conta de mão única.
// Dá para verificar se uma senha bate com o hash, mas não dá para voltar do
// hash à senha. Por que bcrypt e não SHA-256?
//
// * SALT: o bcrypt sorteia 16 bytes aleatórios para cada senha e mistura antes
//   de calcular. Duas pessoas com a senha "123456" ficam com hashes diferentes,
//   então um atacante não consegue usar tabelas prontas de hashes ("rainbow
//   tables") nem descobrir quem usa a mesma senha.
// * CUSTO: o bcrypt é LENTO DE PROPÓSITO. Com custo 10 ele repete o cálculo
//   2^10 = 1.024 vezes (~70 ms). Para quem faz login, é imperceptível; para quem
//   roubou o banco e quer testar bilhões de senhas, vira anos. SHA-256 é feito
//   para ser rápido — ótimo para arquivos, péssimo para senhas.
//
// O hash fica assim: $2b$10$<22 caracteres de salt><31 de hash>. O custo e o
// salt vão junto, por isso bcrypt.compare não precisa de mais nada.
// ---------------------------------------------------------------------------
const CUSTO_BCRYPT = 10;

export const gerarHashSenha = (senha: string) => bcrypt.hash(senha, CUSTO_BCRYPT);
export const conferirSenha = (senha: string, hash: string) => bcrypt.compare(senha, hash);

// Hash de uma senha qualquer, usado quando o e-mail não existe: assim o login
// demora o mesmo tanto com e-mail certo ou errado, e o tempo de resposta não
// revela quais e-mails têm conta ("timing attack").
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe', CUSTO_BCRYPT);
export const conferirSenhaFalsa = (senha: string) => bcrypt.compare(senha, HASH_FALSO);

// ---------------------------------------------------------------------------
// SESSÕES — token aleatório em cookie httpOnly
//
// Ao entrar, sorteamos 32 bytes (256 bits) aleatórios: impossível de adivinhar.
// O navegador recebe o token num cookie "httpOnly" — o JavaScript da página
// não consegue lê-lo, então um script malicioso injetado (XSS) não o rouba.
// No banco guardamos só o SHA-256 do token. Aqui SHA-256 é adequado: o token
// já é aleatório e longo, não há o que "adivinhar" testando combinações.
//
// Por que não JWT? Sessão no banco pode ser revogada na hora (sair, excluir
// conta). Um JWT continua válido até expirar, mesmo depois do "sair".
// ---------------------------------------------------------------------------
export const COOKIE_SESSAO = 'rc_sessao';
export const DURACAO_SESSAO_DIAS = 30;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function criarSessao(usuarioId: number) {
  const token = randomBytes(32).toString('base64url');
  const expira = new Date(Date.now() + DURACAO_SESSAO_DIAS * 86_400_000);
  db.prepare('INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)').run(
    hashToken(token), usuarioId, expira.toISOString(),
  );
  // Limpeza oportunista das sessões vencidas.
  db.prepare('DELETE FROM sessoes WHERE expira_em < ?').run(new Date().toISOString());
  return { token, expira };
}

export function encerrarSessao(token: string) {
  db.prepare('DELETE FROM sessoes WHERE token_hash = ?').run(hashToken(token));
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: 'passageiro' | 'equipe';
  preferencias: Record<string, unknown>;
  criadoEm: string;
}

type LinhaUsuario = { id: number; nome: string; email: string; papel: Usuario['papel']; preferencias: string; criado_em: string };

const paraUsuario = (l: LinhaUsuario): Usuario => ({
  id: l.id, nome: l.nome, email: l.email, papel: l.papel, preferencias: JSON.parse(l.preferencias), criadoEm: l.criado_em,
});

export function buscarUsuario(id: number): Usuario | null {
  const l = db.prepare('SELECT id, nome, email, papel, preferencias, criado_em FROM usuarios WHERE id = ?').get(id) as
    | LinhaUsuario
    | undefined;
  return l ? paraUsuario(l) : null;
}

/** Usuário dono do cookie de sessão da requisição, ou null se não estiver logado. */
export function usuarioDaRequisicao(req: Request): Usuario | null {
  const token = req.cookies?.[COOKIE_SESSAO];
  if (typeof token !== 'string' || !token) return null;
  const l = db
    .prepare(
      `SELECT u.id, u.nome, u.email, u.papel, u.preferencias, u.criado_em
         FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token_hash = ? AND s.expira_em > ?`,
    )
    .get(hashToken(token), new Date().toISOString()) as LinhaUsuario | undefined;
  return l ? paraUsuario(l) : null;
}

// ---------------------------------------------------------------------------
// LIMITE DE TENTATIVAS — contra quem tenta adivinhar senhas em sequência.
// Após 5 erros para o mesmo e-mail a partir do mesmo endereço IP, bloqueia por
// 15 minutos. Fica em memória: reiniciar o servidor zera a contagem, o que é
// aceitável para um sistema local.
// ---------------------------------------------------------------------------
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60_000;
const tentativas = new Map<string, { erros: number; bloqueadoAte: number }>();

export function bloqueadoAte(chave: string): number | null {
  const t = tentativas.get(chave);
  return t && t.bloqueadoAte > Date.now() ? t.bloqueadoAte : null;
}

export function registrarErro(chave: string) {
  const t = tentativas.get(chave) ?? { erros: 0, bloqueadoAte: 0 };
  t.erros += 1;
  if (t.erros >= MAX_TENTATIVAS) {
    t.bloqueadoAte = Date.now() + BLOQUEIO_MS;
    t.erros = 0;
  }
  tentativas.set(chave, t);
}

export const limparErros = (chave: string) => tentativas.delete(chave);

/** Middleware: só segue se houver alguém logado (guarda em res.locals.usuario). */
export function exigirLogin(req: Request, res: Response, next: NextFunction) {
  const usuario = usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Entre na sua conta.' });
  res.locals.usuario = usuario;
  next();
}

/** Middleware: só para a conta da equipe. */
export function exigirEquipe(req: Request, res: Response, next: NextFunction) {
  const usuario = usuarioDaRequisicao(req);
  if (!usuario) return res.status(401).json({ erro: 'Entre na sua conta.' });
  if (usuario.papel !== 'equipe') return res.status(403).json({ erro: 'Acesso só para a equipe.' });
  res.locals.usuario = usuario;
  next();
}

// Limite simples por chave e janela de tempo (feedback, lotação).
const janelas = new Map<string, number[]>();
export function dentroDoLimite(chave: string, maximo: number, janelaMs: number) {
  const agora = Date.now();
  const recentes = (janelas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (recentes.length >= maximo) {
    janelas.set(chave, recentes);
    return false;
  }
  recentes.push(agora);
  janelas.set(chave, recentes);
  return true;
}
