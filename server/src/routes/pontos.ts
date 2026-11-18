import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/conexao.js';
import { catalogo } from '../services/catalogo.js';
import { estimarSegundos, preverChegadas, PARAMETROS } from '../services/previsao.js';
import { agoraLocal, hhmmParaMinutos } from '../services/tempo.js';
import { estado } from '../realtime/estado.js';
import { lotacaoAtual } from '../services/lotacao.js';

export const rotasPontos = Router();

const idValido = z.coerce.number().int().positive();
const MAX_CHEGADAS = 3;

// GET /api/pontos — todos os pontos com os códigos das linhas que passam
rotasPontos.get('/', (_req, res) => {
  res.json(
    catalogo
      .pontos()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((p) => ({ ...p, linhas: catalogo.linhasDoPonto(p.id).map((l) => l.codigo) })),
  );
});

// GET /api/pontos/:id — dados do ponto e as linhas que passam nele
rotasPontos.get('/:id', (req, res) => {
  const id = idValido.safeParse(req.params.id);
  const ponto = id.success ? catalogo.ponto(id.data) : undefined;
  if (!ponto) return res.status(404).json({ erro: 'Ponto não encontrado' });

  res.json({
    ...ponto,
    linhas: catalogo.linhasDoPonto(ponto.id).map((l) => ({
      id: l.id, codigo: l.codigo, nome: l.nome, cor: l.cor,
    })),
  });
});

// GET /api/pontos/:id/previsoes — RF02: quando chegam os próximos ônibus
rotasPontos.get('/:id/previsoes', (req, res) => {
  const id = idValido.safeParse(req.params.id);
  const ponto = id.success ? catalogo.ponto(id.data) : undefined;
  if (!ponto) return res.status(404).json({ erro: 'Ponto não encontrado' });

  const { tipoDia, minutosDoDia } = agoraLocal();
  const saidasHoje = db.prepare(
    'SELECT saida FROM horarios WHERE linha_id = ? AND tipo_dia = ? ORDER BY saida',
  );

  const lotacoes = lotacaoAtual();
  const grupos = [];
  for (const linha of catalogo.linhasDoPonto(ponto.id)) {
    const chegadas = preverChegadas(linha, ponto.id, estado.daLinha(linha.id));

    for (const sentido of ['ida', 'volta'] as const) {
      const parada = linha.paradas.find((p) => p.pontoId === ponto.id && p.sentido === sentido);
      if (!parada) continue;

      const doSentido = chegadas.filter((c) => c.sentido === sentido).slice(0, MAX_CHEGADAS);

      // Sem ônibus em operação: usa a tabela de horários + o tempo de viagem
      // estimado do terminal até este ponto ("previsto pela tabela").
      let proximaPelaTabela: string | null = null;
      if (doSentido.length === 0) {
        const deslocMin = Math.round(
          estimarSegundos(linha, 0, parada.distanciaM, PARAMETROS.velocidadePadraoKmh) / 60,
        );
        const saidas = (saidasHoje.all(linha.id, tipoDia) as { saida: string }[]).map((s) => s.saida);
        const proxima = saidas.find((s) => hhmmParaMinutos(s) + deslocMin >= minutosDoDia);
        if (proxima) {
          const m = hhmmParaMinutos(proxima) + deslocMin;
          proximaPelaTabela = `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        }
      }

      grupos.push({
        linhaId: linha.id,
        codigo: linha.codigo,
        nome: linha.nome,
        cor: linha.cor,
        sentido,
        destino: catalogo.destino(linha, sentido),
        chegadas: doSentido.map((c) => ({
          veiculoId: c.veiculoId,
          prefixo: c.prefixo,
          lotacao: lotacoes.get(c.veiculoId) ?? null,
          acessivel: c.acessivel,
          distanciaM: c.distanciaM,
          minutos: Math.round(c.segundos / 60),
        })),
        proximaPelaTabela,
      });
    }
  }

  // Linhas com ônibus chegando antes aparecem primeiro.
  grupos.sort((a, b) => (a.chegadas[0]?.minutos ?? 999) - (b.chegadas[0]?.minutos ?? 999));
  res.json({ atualizadoEm: new Date().toISOString(), previsoes: grupos });
});
