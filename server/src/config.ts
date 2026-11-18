import 'dotenv/config';
import { z } from 'zod';

// Valida as variáveis de ambiente na inicialização. Todas têm padrão,
// então o projeto roda sem nenhum .env; ele só serve para mudar algo.
const esquema = z.object({
  PORT: z.coerce.number().default(3333),
  // Caminho do arquivo do banco SQLite (relativo à pasta server/).
  DB_ARQUIVO: z.string().default('dados/rotacerta.db'),
  PROVEDOR: z.enum(['simulador', 'sptrans']).default('simulador'),
  SIMULADOR_VELOCIDADE: z.coerce.number().positive().default(1),
  NODE_ENV: z.string().default('development'),
});

export const config = esquema.parse(process.env);
