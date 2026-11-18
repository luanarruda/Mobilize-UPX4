// Guarda a última posição conhecida de cada veículo (em memória) e grava
// uma amostra no histórico do banco a cada HISTORICO_MS.
import { EventEmitter } from 'node:events';
import { db } from '../db/conexao.js';
import type { PosicaoVeiculo } from './tipos.js';

const HISTORICO_MS = 30_000;
const RETENCAO_DIAS = 7; // histórico mais antigo que isso é apagado

class EstadoFrota extends EventEmitter {
  private posicoes = new Map<number, PosicaoVeiculo>();
  private ultimoHistorico = 0;
  private inserir = db.prepare(
    'INSERT INTO posicoes (veiculo_id, lat, lng, velocidade_kmh) VALUES (?, ?, ?, ?)',
  );

  atualizar(lista: PosicaoVeiculo[]) {
    for (const p of lista) this.posicoes.set(p.veiculoId, p);
    this.emit('posicoes', lista);

    if (Date.now() - this.ultimoHistorico >= HISTORICO_MS) {
      this.ultimoHistorico = Date.now();
      try {
        this.gravarHistorico(lista);
      } catch (e) {
        console.error('Falha ao gravar histórico:', (e as Error).message);
      }
    }
  }

  todas(): PosicaoVeiculo[] {
    return [...this.posicoes.values()];
  }

  daLinha(linhaId: number): PosicaoVeiculo[] {
    return this.todas().filter((p) => p.linhaId === linhaId);
  }

  private gravarHistorico(lista: PosicaoVeiculo[]) {
    // Uma transação para o lote inteiro: o SQLite grava no disco uma vez só,
    // em vez de uma vez por ônibus.
    db.exec('BEGIN');
    for (const p of lista) this.inserir.run(p.veiculoId, p.lat, p.lng, p.velocidadeKmh);
    db.exec(
      `DELETE FROM posicoes WHERE registrado_em < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${RETENCAO_DIAS} days')`,
    );
    db.exec('COMMIT');
  }
}

export const estado = new EstadoFrota();
