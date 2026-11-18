import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/conexao.js';
import { catalogo } from '../services/catalogo.js';
import { agoraLocal } from '../services/tempo.js';
import { estado } from '../realtime/estado.js';

export const rotasLinhas = Router();

const idValido = z.coerce.number().int().positive();

// GET /api/linhas — lista resumida (sem o trajeto, que é pesado)
rotasLinhas.get('/', (_req, res) => {
  res.json(
    catalogo.linhas().map((l) => ({
      id: l.id,
      codigo: l.codigo,
      nome: l.nome,
      cor: l.cor,
      empresa: l.empresa,
      // nomes dos pontos, para a busca do front encontrar "Facens" na linha 201
      pontos: [...new Set(l.paradas.map((p) => catalogo.ponto(p.pontoId)!.nome))],
    })),
  );
});

// GET /api/linhas/:id — detalhes: trajeto e pontos em ordem
rotasLinhas.get('/:id', (req, res) => {
  const id = idValido.safeParse(req.params.id);
  const linha = id.success ? catalogo.linha(id.data) : undefined;
  if (!linha) return res.status(404).json({ erro: 'Linha não encontrada' });

  res.json({
    id: linha.id,
    codigo: linha.codigo,
    nome: linha.nome,
    cor: linha.cor,
    empresa: linha.empresa,
    trajeto: linha.trajeto,
    destinos: { ida: catalogo.destino(linha, 'ida'), volta: catalogo.destino(linha, 'volta') },
    pontos: linha.paradas.map((p) => ({ ...catalogo.ponto(p.pontoId)!, ...p, id: p.pontoId })),
  });
});

// GET /api/linhas/:id/horarios — horários programados dos três tipos de dia
rotasLinhas.get('/:id/horarios', (req, res) => {
  const id = idValido.safeParse(req.params.id);
  if (!id.success || !catalogo.linha(id.data)) return res.status(404).json({ erro: 'Linha não encontrada' });

  const linhas = db
    .prepare('SELECT tipo_dia, saida FROM horarios WHERE linha_id = ? ORDER BY saida')
    .all(id.data) as { tipo_dia: 'util' | 'sabado' | 'domingo'; saida: string }[];
  const horarios = { util: [] as string[], sabado: [] as string[], domingo: [] as string[] };
  for (const h of linhas) horarios[h.tipo_dia].push(h.saida);

  res.json({ hoje: agoraLocal().tipoDia, horarios });
});

// GET /api/linhas/:id/veiculos — posições atuais só desta linha
rotasLinhas.get('/:id/veiculos', (req, res) => {
  res.json(estado.daLinha(Number(req.params.id)));
});
