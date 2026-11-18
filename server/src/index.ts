import { createServer } from 'node:http';
import { config } from './config.js';
import { criarApp } from './app.js';
import { iniciarWebSocket } from './realtime/ws.js';
import { estado } from './realtime/estado.js';
import { Simulador } from './realtime/simulador.js';
import type { ProvedorPosicoes } from './realtime/tipos.js';

async function main() {
  const servidor = createServer(criarApp());
  iniciarWebSocket(servidor);

  // Escolhe a fonte das posições pelo .env (o adaptador SPTrans chega na Etapa 6).
  const provedor: ProvedorPosicoes = new Simulador(config.SIMULADOR_VELOCIDADE);
  await provedor.iniciar((posicoes) => estado.atualizar(posicoes));

  servidor.listen(config.PORT, () => {
    console.log(`RotaCerta API em http://localhost:${config.PORT} (posições: ${provedor.nome})`);
  });

  // Encerra com elegância (Ctrl+C), sem deixar timers ou conexões penduradas.
  process.on('SIGINT', () => {
    provedor.parar();
    servidor.close(() => process.exit(0));
  });
}

main().catch((e) => {
  console.error('Falha ao iniciar:', e);
  process.exit(1);
});
