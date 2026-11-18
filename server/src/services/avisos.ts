// RF05 — Avisos de atraso, desvio e interrupção.
//
// Duas origens:
// * OPERAÇÃO: desvios e interrupções publicados pela empresa/órgão gestor
//   (tabela `avisos`, via POST /api/avisos com a chave de administração).
// * AUTOMÁTICO: atrasos detectados pelo próprio sistema, comparando a
//   velocidade atual da linha com a velocidade normal.
//
// Quando a lista muda, emitimos um evento; o WebSocket repassa aos navegadores.
import { EventEmitter } from 'node:events';
import { db } from '../db/conexao.js';
import { catalogo } from './catalogo.js';
import { estimarSegundos, velocidadeOperacionalKmh, PARAMETROS } from './previsao.js';
import type { PosicaoVeiculo } from '../realtime/tipos.js';

export type TipoAviso = 'atraso' | 'desvio' | 'interrupcao';

export interface Aviso {
  id: string;
  linhaId: number;
  codigo: string;
  cor: string;
  tipo: TipoAviso;
  titulo: string;
  mensagem: string;
  desde: string;
  ate: string | null;
  origem: 'operacao' | 'automatico';
}

// HISTERESE: a linha entra em "atraso" abaixo de 15 km/h, mas só sai acima de
// 18 km/h. Com um limite único, uma linha oscilando entre 14 e 16 km/h ligaria
// e desligaria o aviso a cada atualização — e o usuário receberia uma
// notificação nova a cada 30 segundos.
export const LIMIARES_ATRASO = { entraKmh: 15, saiKmh: 18, minAtrasoMin: 3 };

/**
 * Decide se uma linha está atrasada. Função pura (sem banco nem relógio),
 * para poder ser testada isoladamente.
 */
export function avaliarAtraso(
  velocidadeKmh: number,
  jaEstavaAtrasada: boolean,
  tempoNormalS: number,
  tempoAtualS: number,
): { atrasada: boolean; atrasoMin: number } {
  const atrasoMin = Math.round((tempoAtualS - tempoNormalS) / 60);
  const limite = jaEstavaAtrasada ? LIMIARES_ATRASO.saiKmh : LIMIARES_ATRASO.entraKmh;
  const atrasada = velocidadeKmh < limite && atrasoMin >= LIMIARES_ATRASO.minAtrasoMin;
  return { atrasada, atrasoMin };
}

class CentralAvisos extends EventEmitter {
  private automaticos = new Map<number, Aviso>();

  /** Avisos válidos agora: da operação (banco) + automáticos (memória). */
  ativos(): Aviso[] {
    const agora = new Date().toISOString();
    const linhas = db
      .prepare(
        `SELECT id, linha_id, tipo, titulo, mensagem, inicio, fim FROM avisos
          WHERE inicio <= ? AND (fim IS NULL OR fim > ?) ORDER BY inicio DESC`,
      )
      .all(agora, agora) as {
        id: number; linha_id: number; tipo: TipoAviso; titulo: string; mensagem: string; inicio: string; fim: string | null;
      }[];

    const daOperacao: Aviso[] = linhas.flatMap((a) => {
      const linha = catalogo.linha(a.linha_id);
      if (!linha) return [];
      return [{
        id: `op-${a.id}`, linhaId: a.linha_id, codigo: linha.codigo, cor: linha.cor, tipo: a.tipo,
        titulo: a.titulo, mensagem: a.mensagem, desde: a.inicio, ate: a.fim, origem: 'operacao' as const,
      }];
    });
    return [...daOperacao, ...this.automaticos.values()];
  }

  /** Chamado periodicamente com as posições atuais: liga/desliga avisos de atraso. */
  verificarAtrasos(posicoes: PosicaoVeiculo[]) {
    let mudou = false;
    for (const linha of catalogo.linhas()) {
      const daLinha = posicoes.filter((p) => p.linhaId === linha.id);
      if (daLinha.length === 0) continue;

      const vel = velocidadeOperacionalKmh(daLinha);
      // Atraso estimado para uma viagem típica: meia volta (um sentido).
      const meio = linha.totalM / 2;
      const normal = estimarSegundos(linha, 0, meio, PARAMETROS.velocidadePadraoKmh);
      const atual = estimarSegundos(linha, 0, meio, vel);
      const anterior = this.automaticos.get(linha.id);
      const { atrasada, atrasoMin } = avaliarAtraso(vel, !!anterior, normal, atual);

      if (atrasada && !anterior) {
        this.automaticos.set(linha.id, {
          id: `auto-atraso-${linha.id}-${Date.now()}`,
          linhaId: linha.id, codigo: linha.codigo, cor: linha.cor, tipo: 'atraso',
          titulo: `Linha ${linha.codigo} com atraso`,
          mensagem: `Trânsito lento: os ônibus estão a ${Math.round(vel)} km/h em média. As viagens podem levar cerca de ${atrasoMin} min a mais. As previsões já consideram o atraso.`,
          desde: new Date().toISOString(), ate: null, origem: 'automatico',
        });
        mudou = true;
      } else if (!atrasada && anterior) {
        this.automaticos.delete(linha.id);
        mudou = true;
      }
    }
    if (mudou) this.emit('mudou', this.ativos());
  }

  publicar(dados: { linhaId: number; tipo: TipoAviso; titulo: string; mensagem: string; horas?: number }) {
    const fim = dados.horas ? new Date(Date.now() + dados.horas * 3_600_000).toISOString() : null;
    db.prepare('INSERT INTO avisos (linha_id, tipo, titulo, mensagem, fim) VALUES (?, ?, ?, ?, ?)').run(
      dados.linhaId, dados.tipo, dados.titulo, dados.mensagem, fim,
    );
    this.emit('mudou', this.ativos());
  }

  encerrar(id: number) {
    const r = db
      .prepare("UPDATE avisos SET fim = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND (fim IS NULL OR fim > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))")
      .run(id);
    if (r.changes > 0) this.emit('mudou', this.ativos());
    return r.changes > 0;
  }
}

export const avisos = new CentralAvisos();
