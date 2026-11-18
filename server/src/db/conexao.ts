// Banco de dados local: SQLite, embutido no próprio Node.js (módulo node:sqlite).
// Não há servidor de banco para instalar — o banco inteiro é um arquivo
// (server/dados/rotacerta.db). Se o arquivo não existir, é criado e populado
// automaticamente na primeira execução.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { popularBanco } from './popular.js';

const pastaServer = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function abrirBanco(arquivo = resolve(pastaServer, config.DB_ARQUIVO)) {
  const novo = arquivo === ':memory:' || !existsSync(arquivo);
  if (arquivo !== ':memory:') mkdirSync(dirname(arquivo), { recursive: true });

  const banco = new DatabaseSync(arquivo);
  // SQLite vem com chaves estrangeiras DESLIGADAS por padrão (compatibilidade
  // histórica). Ligamos para o banco recusar, por ex., horário de linha inexistente.
  banco.exec('PRAGMA foreign_keys = ON');
  // WAL: leituras não esperam as escritas do histórico terminarem.
  if (arquivo !== ':memory:') banco.exec('PRAGMA journal_mode = WAL');

  if (novo) {
    popularBanco(banco);
    console.log(`Banco criado em ${arquivo}`);
  }
  return banco;
}

// Conexão única do servidor. Em SQLite as operações são síncronas e rápidas
// (o arquivo está no disco local), então uma conexão basta.
export const db = abrirBanco();

/** SQLite guarda booleano como 0/1; converte as colunas indicadas para true/false. */
export function comBooleanos<T extends Record<string, unknown>>(linha: T, ...colunas: (keyof T)[]): T {
  const copia: Record<string, unknown> = { ...linha };
  for (const c of colunas) copia[c as string] = Boolean(linha[c]);
  return copia as T;
}
