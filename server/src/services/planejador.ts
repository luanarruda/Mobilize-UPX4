// RF04 — Planejador de trajetos entre origem e destino, com baldeações.
//
// A rede vira um GRAFO: os vértices são os pontos de parada e as arestas são
// "andar de ônibus da linha X do ponto A até o ponto B" ou "caminhar de A até
// um ponto próximo". Procuramos o caminho que chega MAIS CEDO com o algoritmo
// de Dijkstra, com dois cuidados:
//
// 1. O custo de uma aresta de ônibus depende da hora em que chegamos ao ponto:
//    a espera é até o PRÓXIMO ônibus daquela linha passar ali. Por isso usamos
//    as posições em tempo real (as mesmas da previsão de chegada) — é o que a
//    literatura chama de grafo "dependente do tempo".
// 2. Cada baldeação soma uma penalidade no custo. Sem ela, o algoritmo trocaria
//    de ônibus três vezes para chegar 1 minuto antes, o que ninguém quer.
//
// Guardamos o melhor resultado para 1, 2 e 3 ônibus, então a pessoa pode
// escolher entre "chegar mais cedo" e "trocar menos de ônibus".

import { aFrente, estimarSegundos, velocidadeOperacionalKmh } from './previsao.js';
import { distanciaM, distanciasAcumuladas, trechoDoTrajeto, type Coord } from '../geo.js';
import type { LinhaCatalogo, PontoCatalogo } from './catalogo.js';
import type { PosicaoVeiculo } from '../realtime/tipos.js';

export const PARAMETROS_PLANO = {
  maxOnibus: 3,                 // até 2 baldeações
  penalidadeBaldeacaoS: 180,    // "custo" extra de cada troca de ônibus
  margemBaldeacaoS: 60,         // tempo mínimo para descer e pegar outro ônibus
  caminhadaMaxM: 500,           // distância máxima a pé entre dois pontos
  velocidadeCaminhadaMs: 1.2,   // ≈ 4,3 km/h
  fatorDesvioCaminhada: 1.3,    // ruas não são linha reta
  folgaDominanciaS: 300,        // só mostra opção com mais trocas se chegar 5 min antes
};

export interface OpcoesPlano {
  /** Só ônibus acessíveis, baldeação só em pontos acessíveis e sem trechos a pé. */
  acessivel?: boolean;
}

interface Rede {
  linhas: LinhaCatalogo[];
  pontos: PontoCatalogo[];
}

export type Trecho =
  | {
      tipo: 'onibus';
      linhaId: number;
      sentido: 'ida' | 'volta';
      embarqueId: number;
      desembarqueId: number;
      prefixo: string;
      acessivel: boolean;
      partidaS: number;      // segundos a partir de agora
      chegadaS: number;
      esperaS: number;
      paradas: number;       // quantos pontos até descer (inclui o de descida)
      caminho: Coord[];
    }
  | {
      tipo: 'caminhada';
      deId: number;
      paraId: number;
      distanciaM: number;
      partidaS: number;
      chegadaS: number;
      caminho: Coord[];
    };

export interface Itinerario {
  chegadaS: number;
  baldeacoes: number;
  trechos: Trecho[];
}

interface Estado {
  pontoId: number;
  t: number;              // segundos desde agora
  custo: number;          // t + penalidades (é o que o Dijkstra minimiza)
  onibus: number;         // quantos ônibus já usados
  ultimaLinha: number | null;
  veioCaminhando: boolean;
  anterior: Estado | null;
  trecho: Trecho | null;
}

/** Fila de prioridade simples (heap binário) ordenada por custo. */
class FilaPrioridade {
  private itens: Estado[] = [];
  get tamanho() { return this.itens.length; }
  inserir(e: Estado) {
    const a = this.itens;
    a.push(e);
    let i = a.length - 1;
    while (i > 0) {
      const pai = (i - 1) >> 1;
      if (a[pai].custo <= a[i].custo) break;
      [a[pai], a[i]] = [a[i], a[pai]];
      i = pai;
    }
  }
  retirar(): Estado {
    const a = this.itens;
    const topo = a[0];
    const ultimo = a.pop()!;
    if (a.length > 0) {
      a[0] = ultimo;
      let i = 0;
      for (;;) {
        const e = 2 * i + 1, d = e + 1;
        let menor = i;
        if (e < a.length && a[e].custo < a[menor].custo) menor = e;
        if (d < a.length && a[d].custo < a[menor].custo) menor = d;
        if (menor === i) break;
        [a[menor], a[i]] = [a[i], a[menor]];
        i = menor;
      }
    }
    return topo;
  }
}

export function planejar(
  rede: Rede,
  veiculos: PosicaoVeiculo[],
  origemId: number,
  destinoId: number,
  opcoes: OpcoesPlano = {},
): Itinerario[] {
  const P = PARAMETROS_PLANO;
  const pontos = new Map(rede.pontos.map((p) => [p.id, p]));

  // Dados pré-calculados por linha: velocidade atual, tempo de uma volta e ônibus.
  const infoLinha = new Map(
    rede.linhas.map((l) => {
      const daLinha = veiculos.filter((v) => v.linhaId === l.id);
      const vel = velocidadeOperacionalKmh(daLinha);
      return [l.id, {
        vel,
        voltaS: estimarSegundos(l, 0, l.totalM - 1, vel),
        acc: distanciasAcumuladas(l.trajeto),
        onibus: opcoes.acessivel ? daLinha.filter((v) => v.acessivel) : daLinha,
      }];
    }),
  );

  /** Primeiro ônibus da linha que passa na parada a partir do instante t. */
  function proximoOnibus(linha: LinhaCatalogo, distParada: number, t: number) {
    const { vel, voltaS, onibus } = infoLinha.get(linha.id)!;
    let melhor: { t: number; v: PosicaoVeiculo } | null = null;
    for (const v of onibus) {
      const base = estimarSegundos(linha, v.distanciaNoTrajeto, aFrente(v.distanciaNoTrajeto, distParada, linha.totalM), vel);
      // Se este ônibus passa antes de chegarmos, consideramos as voltas seguintes.
      for (let volta = 0; volta < 3; volta++) {
        const chegada = base + volta * voltaS;
        if (chegada >= t) {
          if (!melhor || chegada < melhor.t) melhor = { t: chegada, v };
          break;
        }
      }
    }
    return melhor;
  }

  // Pontos próximos para caminhada (calculado uma vez).
  const vizinhos = new Map<number, { id: number; m: number }[]>();
  if (!opcoes.acessivel) {
    for (const a of rede.pontos) {
      vizinhos.set(
        a.id,
        rede.pontos
          .filter((b) => b.id !== a.id)
          .map((b) => ({ id: b.id, m: distanciaM([a.lat, a.lng], [b.lat, b.lng]) * P.fatorDesvioCaminhada }))
          .filter((b) => b.m <= P.caminhadaMaxM),
      );
    }
  }

  const fila = new FilaPrioridade();
  const visitados = new Set<string>();
  const melhoresPorQtd = new Map<number, Estado>();
  fila.inserir({ pontoId: origemId, t: 0, custo: 0, onibus: 0, ultimaLinha: null, veioCaminhando: false, anterior: null, trecho: null });

  while (fila.tamanho > 0) {
    const atual = fila.retirar();
    const chave = `${atual.pontoId}|${atual.onibus}|${atual.veioCaminhando}`;
    if (visitados.has(chave)) continue;
    visitados.add(chave);

    if (atual.pontoId === destinoId && atual.onibus > 0) {
      if (!melhoresPorQtd.has(atual.onibus)) melhoresPorQtd.set(atual.onibus, atual);
      continue; // não faz sentido seguir viagem depois de chegar
    }

    // Arestas de caminhada (no máximo um trecho a pé seguido).
    if (!atual.veioCaminhando) {
      for (const viz of vizinhos.get(atual.pontoId) ?? []) {
        const dur = viz.m / P.velocidadeCaminhadaMs;
        const de = pontos.get(atual.pontoId)!, para = pontos.get(viz.id)!;
        fila.inserir({
          ...atual,
          pontoId: viz.id,
          t: atual.t + dur,
          custo: atual.custo + dur,
          veioCaminhando: true,
          anterior: atual,
          trecho: {
            tipo: 'caminhada', deId: de.id, paraId: para.id, distanciaM: Math.round(viz.m),
            partidaS: atual.t, chegadaS: atual.t + dur, caminho: [[de.lat, de.lng], [para.lat, para.lng]],
          },
        });
      }
    }

    // Arestas de ônibus.
    if (atual.onibus >= P.maxOnibus) continue;
    const ehBaldeacao = atual.onibus > 0;
    if (ehBaldeacao && opcoes.acessivel && !pontos.get(atual.pontoId)!.acessivel) continue;

    for (const linha of rede.linhas) {
      if (linha.id === atual.ultimaLinha) continue; // descer e subir na mesma linha não ajuda
      const { vel, acc } = infoLinha.get(linha.id)!;
      const n = linha.paradas.length;

      linha.paradas.forEach((embarque, i) => {
        if (embarque.pontoId !== atual.pontoId) return;
        const prox = proximoOnibus(linha, embarque.distanciaM, atual.t + (ehBaldeacao ? P.margemBaldeacaoS : 0));
        if (!prox) return;

        // Pode descer em qualquer ponto à frente, sem completar a volta.
        for (let k = 1; k < n; k++) {
          const desembarque = linha.paradas[(i + k) % n];
          if (desembarque.pontoId === embarque.pontoId) break;
          const dist = aFrente(embarque.distanciaM, desembarque.distanciaM, linha.totalM);
          const viagem = estimarSegundos(linha, embarque.distanciaM, dist, vel);
          const chegada = prox.t + viagem;
          fila.inserir({
            pontoId: desembarque.pontoId,
            t: chegada,
            custo: atual.custo + (chegada - atual.t) + (ehBaldeacao ? P.penalidadeBaldeacaoS : 0),
            onibus: atual.onibus + 1,
            ultimaLinha: linha.id,
            veioCaminhando: false,
            anterior: atual,
            trecho: {
              tipo: 'onibus', linhaId: linha.id, sentido: embarque.sentido,
              embarqueId: embarque.pontoId, desembarqueId: desembarque.pontoId,
              prefixo: prox.v.prefixo, acessivel: prox.v.acessivel,
              partidaS: prox.t, chegadaS: chegada, esperaS: prox.t - atual.t, paradas: k,
              caminho: trechoDoTrajeto(linha.trajeto, acc, embarque.distanciaM, dist),
            },
          });
        }
      });
    }
  }

  // Reconstrói cada itinerário seguindo os ponteiros "anterior" de trás para frente.
  const itinerarios: Itinerario[] = [...melhoresPorQtd.values()].map((fim) => {
    const trechos: Trecho[] = [];
    for (let e: Estado | null = fim; e?.trecho; e = e.anterior) trechos.unshift(e.trecho);
    return { chegadaS: fim.t, baldeacoes: fim.onibus - 1, trechos };
  });

  // Descarta opções que trocam mais de ônibus sem chegar bem antes.
  itinerarios.sort((a, b) => a.baldeacoes - b.baldeacoes);
  const uteis: Itinerario[] = [];
  for (const it of itinerarios) {
    if (uteis.every((u) => it.chegadaS < u.chegadaS - P.folgaDominanciaS)) uteis.push(it);
  }
  return uteis.sort((a, b) => a.chegadaS - b.chegadaS);
}
