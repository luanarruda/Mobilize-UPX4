// Migrações: mudanças no banco aplicadas em ordem, uma única vez.
//
// Problema que resolvem: quem já tem o arquivo rotacerta.db no computador
// (criado na Etapa 1/2) não pode perder os dados nem precisar apagar o banco
// toda vez que uma tabela nova aparece. O SQLite tem um contador interno,
// PRAGMA user_version, onde guardamos "até qual migração este banco já foi".
// Ao iniciar, aplicamos só as que faltam.
import type { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

export const CONTA_DEMO = {
  nome: 'Conta Demonstração',
  email: 'demo@rotacerta.com.br',
  senha: 'rotacerta2026',
};

type Migracao = (banco: DatabaseSync) => void;

const MIGRACOES: Migracao[] = [
  // 1 — estrutura base (linhas, pontos, horários...). Aplicada por popular.ts.
  () => {},

  // 2 — Etapa 4: contas (RF08), favoritos (RF06) e avisos (RF05).
  (banco) => {
    banco.exec(`
      CREATE TABLE usuarios (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        nome            TEXT NOT NULL,
        email           TEXT NOT NULL UNIQUE COLLATE NOCASE,
        senha_hash      TEXT NOT NULL,
        preferencias    TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(preferencias)),
        -- LGPD: quando a pessoa aceitou a política de privacidade
        consentimento_em TEXT NOT NULL,
        criado_em       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      -- Sessões de login. Guardamos só o HASH do token: se alguém copiar o
      -- arquivo do banco, não consegue usar os tokens para entrar nas contas.
      CREATE TABLE sessoes (
        token_hash  TEXT PRIMARY KEY,
        usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        expira_em   TEXT NOT NULL
      );
      CREATE INDEX idx_sessoes_usuario ON sessoes(usuario_id);

      CREATE TABLE favoritos (
        usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo        TEXT NOT NULL CHECK (tipo IN ('linha', 'ponto')),
        ref_id      INTEGER NOT NULL,
        criado_em   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        PRIMARY KEY (usuario_id, tipo, ref_id)
      );

      -- Avisos publicados pela operação (desvios, interrupções). Os atrasos
      -- são detectados automaticamente e ficam só em memória (services/avisos.ts).
      CREATE TABLE avisos (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        linha_id  INTEGER NOT NULL REFERENCES linhas(id) ON DELETE CASCADE,
        tipo      TEXT NOT NULL CHECK (tipo IN ('atraso', 'desvio', 'interrupcao')),
        titulo    TEXT NOT NULL,
        mensagem  TEXT NOT NULL,
        inicio    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        fim       TEXT
      );
    `);

    // Conta de demonstração: existe em todo computador, porque é criada aqui.
    // Custo 10 do bcrypt (ver services/auth.ts para a explicação).
    const r = banco
      .prepare(
        `INSERT INTO usuarios (nome, email, senha_hash, consentimento_em)
         VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
      )
      .run(CONTA_DEMO.nome, CONTA_DEMO.email, bcrypt.hashSync(CONTA_DEMO.senha, 10));
    const demoId = Number(r.lastInsertRowid);

    // Favoritos de exemplo, para a demonstração já começar com algo na tela.
    const linha201 = banco.prepare("SELECT id FROM linhas WHERE codigo = '201'").get() as { id: number } | undefined;
    const facens = banco.prepare("SELECT id FROM pontos WHERE nome = 'Facens'").get() as { id: number } | undefined;
    const favoritar = banco.prepare('INSERT INTO favoritos (usuario_id, tipo, ref_id) VALUES (?, ?, ?)');
    if (linha201) favoritar.run(demoId, 'linha', linha201.id);
    if (facens) favoritar.run(demoId, 'ponto', facens.id);

    // Um desvio de exemplo, válido por 30 dias.
    const linha405 = banco.prepare("SELECT id FROM linhas WHERE codigo = '405'").get() as { id: number } | undefined;
    if (linha405) {
      banco
        .prepare(
          `INSERT INTO avisos (linha_id, tipo, titulo, mensagem, fim)
           VALUES (?, 'desvio', ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days'))`,
        )
        .run(
          linha405.id,
          'Desvio na Av. Ipanema',
          'Obras na pista: os ônibus seguem por rua paralela entre a Rodoviária e a Av. Ipanema. Os pontos continuam atendidos.',
        );
    }
  },
];

/** Aplica, em ordem, as migrações que este banco ainda não tem. */
export function migrar(banco: DatabaseSync, bancoNovo: boolean) {
  let versao = (banco.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  // Bancos criados antes deste sistema existir já têm a estrutura base.
  if (versao === 0) versao = 1;
  if (bancoNovo) versao = 1;

  for (let i = versao; i < MIGRACOES.length; i++) {
    banco.exec('BEGIN');
    try {
      MIGRACOES[i](banco);
      banco.exec(`PRAGMA user_version = ${i + 1}`);
      banco.exec('COMMIT');
      console.log(`Banco atualizado para a versão ${i + 1}`);
    } catch (erro) {
      banco.exec('ROLLBACK');
      throw erro;
    }
  }
}
