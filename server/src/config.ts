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
  // Gera lentidões aleatórias nas linhas, para demonstrar os avisos de atraso (RF05).
  SIMULADOR_INCIDENTES: z.enum(['0', '1']).default('1'),
  // Chave para publicar avisos de desvio/interrupção pela API. Troque em produção.
  ADMIN_CHAVE: z.string().min(4).default('demo'),
  NODE_ENV: z.string().default('development'),
});

export const config = esquema.parse(process.env);
