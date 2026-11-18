import { defineConfig } from 'vitest/config';

// Os testes usam um banco SQLite em memória: começa vazio a cada execução e
// não toca no arquivo dados/rotacerta.db de quem está desenvolvendo.
export default defineConfig({
  test: {
    env: { DB_ARQUIVO: ':memory:', ADMIN_CHAVE: 'chave-de-teste' },
  },
});
