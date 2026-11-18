import { useEffect, useState } from 'react';
import type { PosicaoVeiculo } from '../api';

export type StatusConexao = 'conectando' | 'ao-vivo' | 'reconectando';

/**
 * Mantém um WebSocket aberto com o servidor e devolve a posição mais recente
 * de cada ônibus. Se a conexão cair (Wi-Fi instável, servidor reiniciando),
 * tenta de novo com espera crescente: 1s, 2s, 4s... até 30s.
 */
export function usePosicoes() {
  const [posicoes, setPosicoes] = useState<Map<number, PosicaoVeiculo>>(new Map());
  const [status, setStatus] = useState<StatusConexao>('conectando');

  useEffect(() => {
    let socket: WebSocket | undefined;
    let tentativas = 0;
    let timer: number | undefined;
    let encerrado = false;

    const conectar = () => {
      const protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protocolo}://${location.host}/ws`);

      socket.onopen = () => {
        tentativas = 0;
        setStatus('ao-vivo');
      };
      socket.onmessage = (evento) => {
        const msg = JSON.parse(evento.data);
        if (msg.tipo !== 'posicoes') return;
        setPosicoes((anterior) => {
          const nova = new Map(anterior);
          for (const p of msg.dados as PosicaoVeiculo[]) nova.set(p.veiculoId, p);
          return nova;
        });
      };
      socket.onclose = () => {
        if (encerrado) return;
        setStatus('reconectando');
        const espera = Math.min(30_000, 1000 * 2 ** tentativas++);
        timer = window.setTimeout(conectar, espera);
      };
    };

    conectar();
    return () => {
      encerrado = true;
      window.clearTimeout(timer);
      socket?.close();
    };
  }, []);

  return { posicoes, status };
}
