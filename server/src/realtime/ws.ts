// WebSocket: canal aberto entre navegador e servidor. Em vez de o navegador
// perguntar "e agora?" a cada segundos (polling), o servidor EMPURRA as
// posições assim que mudam. Menos tráfego e atualização imediata.
import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { estado } from './estado.js';
import { avisos } from '../services/avisos.js';

export function iniciarWebSocket(servidor: Server) {
  const wss = new WebSocketServer({ server: servidor, path: '/ws' });

  wss.on('connection', (socket) => {
    // Quem acabou de conectar recebe logo a foto atual, sem esperar o próximo ciclo.
    socket.send(JSON.stringify({ tipo: 'posicoes', dados: estado.todas() }));
    socket.send(JSON.stringify({ tipo: 'avisos', dados: avisos.ativos() }));
  });

  const transmitir = (msg: string) => {
    for (const cliente of wss.clients) {
      if (cliente.readyState === WebSocket.OPEN) cliente.send(msg);
    }
  };
  estado.on('posicoes', (dados) => transmitir(JSON.stringify({ tipo: 'posicoes', dados })));
  avisos.on('mudou', (dados) => transmitir(JSON.stringify({ tipo: 'avisos', dados })));

  return wss;
}
