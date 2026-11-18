// Guarda a última posição conhecida de cada veículo (em memória) e grava
// uma amostra no histórico do banco a cada HISTORICO_MS.
import { EventEmitter } from 'node:events';
import { pool } from '../db/pool.js';
import type { PosicaoVeiculo } from './tipos.js';

const HISTORICO_MS = 30_000;

class EstadoFrota extends EventEmitter {
  private posicoes = new Map<number, PosicaoVeiculo>();
  private ultimoHistorico = 0;

  atualizar(lista: PosicaoVeiculo[]) {
    for (const p of lista) this.posicoes.set(p.veiculoId, p);
    this.emit('posicoes', lista);

    if (Date.now() - this.ultimoHistorico >= HISTORICO_MS) {
      this.ultimoHistorico = Date.now();
      this.gravarHistorico(lista).catch((e) => console.error('Falha ao gravar histórico:', e.message));
    }
  }

  todas(): PosicaoVeiculo[] {
    return [...this.posicoes.values()];
  }

  daLinha(linhaId: number): PosicaoVeiculo[] {
    return this.todas().filter((p) => p.linhaId === linhaId);
  }

  private async gravarHistorico(lista: PosicaoVeiculo[]) {
    if (lista.length === 0) return;
    // Um único INSERT com vários VALUES é bem mais rápido que um INSERT por ônibus.
    const valores: unknown[] = [];
    const linhas = lista.map((p, i) => {
      valores.push(p.veiculoId, p.lat, p.lng, p.velocidadeKmh);
      const b = i * 4;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`;
    });
    await pool.query(
      `INSERT INTO posicoes (veiculo_id, lat, lng, velocidade_kmh) VALUES ${linhas.join(',')}`,
      valores,
    );
  }
}

export const estado = new EstadoFrota();
