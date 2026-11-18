import pg from 'pg';
import { config } from '../config.js';

// Pool = conjunto de conexões reaproveitadas. Abrir uma conexão nova a cada
// requisição é lento; o pool mantém algumas abertas e empresta quando precisa.
export const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
