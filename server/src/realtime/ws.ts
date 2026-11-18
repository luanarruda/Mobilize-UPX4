// WebSocket: canal aberto entre navegador e servidor. Em vez de o navegador
// perguntar "e agora?" a cada segundos (polling), o servidor EMPURRA as
// posições assim que mudam. Menos tráfego e atualização imediata.
import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { estado } from './estado.js';

export function iniciarWebSocket(servidor: Server) {
  const wss = new WebSocketServer({ server: servidor, path: '/ws' });

  wss.on('connection', (socket) => {
    // Quem acabou de conectar recebe logo a foto atual, sem esperar o próximo ciclo.
    socket.send(JSON.stringify({ tipo: 'posicoes', dados: estado.todas() }));
  });

  estado.on('posicoes', (dados) => {
    const msg = JSON.stringify({ tipo: 'posicoes', dados });
    for (const cliente of wss.clients) {
      if (cliente.readyState === WebSocket.OPEN) cliente.send(msg);
    }
  });

  return wss;
}
