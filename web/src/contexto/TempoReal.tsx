import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PosicaoVeiculo } from '../api';

export type StatusConexao = 'conectando' | 'ao-vivo' | 'reconectando';

interface ValorTempoReal {
  posicoes: Map<number, PosicaoVeiculo>;
  status: StatusConexao;
}

const Contexto = createContext<ValorTempoReal | null>(null);

/**
 * UMA conexão WebSocket para o site inteiro, aberta no topo da aplicação.
 * Antes, cada página abria a sua; ao navegar, a conexão caía e reabria.
 * Agora as páginas só leem o contexto. Se a conexão cair, tenta de novo com
 * espera crescente: 1 s, 2 s, 4 s... até 30 s (exponential backoff).
 */
export function ProvedorTempoReal({ children }: { children: ReactNode }) {
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
        if (msg.tipo === 'posicoes') {
          setPosicoes((anterior) => {
            const nova = new Map(anterior);
            for (const p of msg.dados as PosicaoVeiculo[]) nova.set(p.veiculoId, p);
            return nova;
          });
        }
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

  return <Contexto.Provider value={{ posicoes, status }}>{children}</Contexto.Provider>;
}

export function useTempoReal() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useTempoReal precisa estar dentro de ProvedorTempoReal');
  return ctx;
}
