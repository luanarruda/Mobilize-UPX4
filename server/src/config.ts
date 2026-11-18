import 'dotenv/config';
import { z } from 'zod';

// Valida as variáveis de ambiente na inicialização: se faltar algo,
// o servidor falha logo com uma mensagem clara, em vez de quebrar depois.
const esquema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3333),
  PROVEDOR: z.enum(['simulador', 'sptrans']).default('simulador'),
  SIMULADOR_VELOCIDADE: z.coerce.number().positive().default(1),
});

export const config = esquema.parse(process.env);
