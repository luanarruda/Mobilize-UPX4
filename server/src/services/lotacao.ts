// RF09 — Lotação colaborativa: passageiros informam quão cheio está o ônibus.
//
// Como juntamos vários relatos em uma informação só:
// * VALIDADE: só contam relatos dos últimos 20 minutos — lotação muda a cada
//   ponto, e um relato de uma hora atrás não diz nada sobre agora.
// * UMA VOZ POR PESSOA: se alguém informar duas vezes, vale só o último relato
//   dela (agrupamos pelo "autor" anônimo).
// * MÉDIA PONDERADA PELA IDADE: um relato de agora pesa 1; um de 20 minutos
//   atrás pesa quase nada. Assim a informação acompanha o ônibus esvaziando
//   ou enchendo, sem ser dominada por relatos antigos.
import { db } from '../db/conexao.js';

export const NIVEIS = ['vazio', 'sentados', 'em-pe', 'lotado'] as const;
export const VALIDADE_MIN = 20;

export interface Relato {
  autor: string;
  nivel: number;
  criadoEm: string;
}

export interface Lotacao {
  nivel: number;          // 0 vazio · 1 lugares sentados · 2 em pé · 3 lotado
  relatos: number;        // quantas pessoas diferentes informaram
  atualizadoEm: string;   // relato mais recente
}

/** Função pura: consolida relatos em um nível (ou null se não houver relatos válidos). */
export function consolidarLotacao(relatos: Relato[], agora = Date.now()): Lotacao | null {
  const validadeMs = VALIDADE_MIN * 60_000;
  const ultimoPorAutor = new Map<string, Relato>();
  for (const r of relatos) {
    const idade = agora - Date.parse(r.criadoEm);
    if (idade < 0 || idade > validadeMs) continue;
    const atual = ultimoPorAutor.get(r.autor);
    if (!atual || r.criadoEm > atual.criadoEm) ultimoPorAutor.set(r.autor, r);
  }
  if (ultimoPorAutor.size === 0) return null;

  let soma = 0;
  let pesos = 0;
  let maisRecente = '';
  for (const r of ultimoPorAutor.values()) {
    const peso = Math.max(0.05, 1 - (agora - Date.parse(r.criadoEm)) / validadeMs);
    soma += r.nivel * peso;
    pesos += peso;
    if (r.criadoEm > maisRecente) maisRecente = r.criadoEm;
  }
  return { nivel: Math.round(soma / pesos), relatos: ultimoPorAutor.size, atualizadoEm: maisRecente };
}

const limite = () => new Date(Date.now() - VALIDADE_MIN * 60_000).toISOString();

/** Lotação atual de todos os ônibus com relatos recentes. */
export function lotacaoAtual(): Map<number, Lotacao> {
  const linhas = db
    .prepare(
      `SELECT veiculo_id, autor, nivel, criado_em FROM lotacao_relatos
        WHERE criado_em >= ? ORDER BY veiculo_id`,
    )
    .all(limite()) as { veiculo_id: number; autor: string; nivel: number; criado_em: string }[];

  const porVeiculo = new Map<number, Relato[]>();
  for (const l of linhas) {
    const lista = porVeiculo.get(l.veiculo_id) ?? [];
    lista.push({ autor: l.autor, nivel: l.nivel, criadoEm: l.criado_em });
    porVeiculo.set(l.veiculo_id, lista);
  }
  const resultado = new Map<number, Lotacao>();
  for (const [id, relatos] of porVeiculo) {
    const c = consolidarLotacao(relatos);
    if (c) resultado.set(id, c);
  }
  return resultado;
}

export function registrarRelato(veiculoId: number, nivel: number, autorHash: string, usuarioId: number | null) {
  db.prepare('INSERT INTO lotacao_relatos (veiculo_id, nivel, autor, usuario_id) VALUES (?, ?, ?, ?)').run(
    veiculoId, nivel, autorHash, usuarioId,
  );
  // Relatos com mais de 7 dias são apagados: servem só para análises recentes.
  db.prepare("DELETE FROM lotacao_relatos WHERE criado_em < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')").run();
  return lotacaoAtual().get(veiculoId) ?? null;
}
