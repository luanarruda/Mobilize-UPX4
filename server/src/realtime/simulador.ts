// Simulador de frota: move os ônibus ao longo do trajeto de cada linha.
// Substitui os GPS reais enquanto não temos acesso aos dados da operação
// (risco previsto na seção 5 da documentação).
import { db } from '../db/conexao.js';
import { distanciasAcumuladas, pontoNaDistancia, rumo, type Coord } from '../geo.js';
import type { PosicaoVeiculo, ProvedorPosicoes } from './tipos.js';

const INTERVALO_MS = 2000;      // de quanto em quanto tempo o mundo "anda"
const PARADA_S: [number, number] = [15, 40]; // tempo parado em cada ponto (mín, máx)

interface LinhaSim {
  trajeto: Coord[];
  acc: number[];
  total: number;
  paradas: number[]; // distâncias dos pontos no trajeto, em ordem
}

interface VeiculoSim {
  id: number;
  prefixo: string;
  linhaId: number;
  acessivel: boolean;
  distancia: number;
  velocidadeKmh: number;
  paradoAte: number;   // timestamp; enquanto for futuro, o ônibus está no ponto
  proximaParada: number; // índice em LinhaSim.paradas
}

const sortear = (min: number, max: number) => min + Math.random() * (max - min);

export class Simulador implements ProvedorPosicoes {
  readonly nome = 'simulador';
  private linhas = new Map<number, LinhaSim>();
  private veiculos: VeiculoSim[] = [];
  private timer?: NodeJS.Timeout;

  constructor(private fatorTempo = 1) {}

  async iniciar(aoAtualizar: (p: PosicaoVeiculo[]) => void) {
    this.carregar();
    this.timer = setInterval(() => aoAtualizar(this.passo(INTERVALO_MS / 1000)), INTERVALO_MS);
    aoAtualizar(this.passo(0));
  }

  parar() {
    clearInterval(this.timer);
  }

  private carregar() {
    const linhas = db.prepare('SELECT id, trajeto FROM linhas').all() as { id: number; trajeto: string }[];
    const lp = db
      .prepare('SELECT linha_id, distancia_m FROM linha_pontos ORDER BY linha_id, ordem')
      .all() as { linha_id: number; distancia_m: number }[];
    for (const l of linhas) {
      const trajeto = JSON.parse(l.trajeto) as Coord[];
      const acc = distanciasAcumuladas(trajeto);
      const paradas = lp.filter((r) => r.linha_id === l.id).map((r) => Number(r.distancia_m));
      this.linhas.set(l.id, { trajeto, acc, total: acc[acc.length - 1], paradas });
    }

    const veiculos = db
      .prepare('SELECT id, prefixo, linha_id, acessivel FROM veiculos WHERE linha_id IS NOT NULL ORDER BY id')
      .all() as { id: number; prefixo: string; linha_id: number; acessivel: number }[];
    // Espalha os ônibus de cada linha igualmente pelo trajeto, como numa operação real.
    const porLinha = new Map<number, typeof veiculos>();
    for (const v of veiculos) porLinha.set(v.linha_id, [...(porLinha.get(v.linha_id) ?? []), v]);
    for (const [linhaId, lista] of porLinha) {
      const linha = this.linhas.get(linhaId)!;
      lista.forEach((v, i) => {
        const distancia = (linha.total / lista.length) * i;
        this.veiculos.push({
          id: v.id,
          prefixo: v.prefixo,
          linhaId,
          acessivel: Boolean(v.acessivel),
          distancia,
          velocidadeKmh: sortear(20, 35),
          paradoAte: 0,
          proximaParada: this.indiceProximaParada(linha, distancia),
        });
      });
    }
  }

  private indiceProximaParada(linha: LinhaSim, distancia: number) {
    const i = linha.paradas.findIndex((d) => d > distancia);
    return i === -1 ? 0 : i;
  }

  /** Avança a simulação dt segundos e devolve as posições atuais. */
  private passo(dtReal: number): PosicaoVeiculo[] {
    const agora = Date.now();
    const dt = dtReal * this.fatorTempo;

    for (const v of this.veiculos) {
      if (v.paradoAte > agora) continue;
      const linha = this.linhas.get(v.linhaId)!;

      // Varia a velocidade aos poucos (trânsito), limitada entre 12 e 45 km/h.
      v.velocidadeKmh = Math.min(45, Math.max(12, v.velocidadeKmh + sortear(-3, 3)));
      const andou = (v.velocidadeKmh / 3.6) * dt;

      // Distância até a próxima parada, tratando a volta ao início do circuito.
      const alvo = linha.paradas[v.proximaParada];
      let falta = alvo - v.distancia;
      if (falta < 0) falta += linha.total;

      if (andou >= falta) {
        // Chegou ao ponto: para ali por um tempo e mira o seguinte.
        v.distancia = alvo;
        v.paradoAte = agora + (sortear(...PARADA_S) * 1000) / this.fatorTempo;
        v.proximaParada = (v.proximaParada + 1) % linha.paradas.length;
      } else {
        v.distancia = (v.distancia + andou) % linha.total;
      }
    }

    const iso = new Date(agora).toISOString();
    return this.veiculos.map((v) => {
      const linha = this.linhas.get(v.linhaId)!;
      const [lat, lng] = pontoNaDistancia(linha.trajeto, linha.acc, v.distancia);
      const adiante = pontoNaDistancia(linha.trajeto, linha.acc, v.distancia + 20);
      const parado = v.paradoAte > agora;
      return {
        veiculoId: v.id,
        prefixo: v.prefixo,
        linhaId: v.linhaId,
        lat,
        lng,
        rumo: rumo([lat, lng], adiante),
        velocidadeKmh: parado ? 0 : Math.round(v.velocidadeKmh),
        acessivel: v.acessivel,
        distanciaNoTrajeto: v.distancia,
        atualizadoEm: iso,
      };
    });
  }
}
