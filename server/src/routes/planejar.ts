import { Router } from 'express';
import { z } from 'zod';
import { catalogo } from '../services/catalogo.js';
import { planejar } from '../services/planejador.js';
import { estado } from '../realtime/estado.js';

export const rotasPlanejar = Router();

const consulta = z.object({
  origem: z.coerce.number().int().positive(),
  destino: z.coerce.number().int().positive(),
  acessivel: z.enum(['0', '1']).optional(),
});

// GET /api/planejar?origem=1&destino=8&acessivel=1 — RF04
rotasPlanejar.get('/', (req, res) => {
  const q = consulta.safeParse(req.query);
  if (!q.success) return res.status(400).json({ erro: 'Informe origem e destino.' });
  const { origem, destino } = q.data;
  if (!catalogo.ponto(origem) || !catalogo.ponto(destino)) {
    return res.status(404).json({ erro: 'Ponto de origem ou destino não encontrado.' });
  }
  if (origem === destino) return res.status(400).json({ erro: 'Origem e destino são o mesmo ponto.' });

  const itinerarios = planejar(
    { linhas: catalogo.linhas(), pontos: catalogo.pontos() },
    estado.todas(),
    origem,
    destino,
    { acessivel: q.data.acessivel === '1' },
  );

  // Acrescenta nomes e cores, para o front não precisar de outras consultas.
  const nome = (id: number) => catalogo.ponto(id)!.nome;
  res.json({
    calculadoEm: new Date().toISOString(),
    itinerarios: itinerarios.map((it) => ({
      ...it,
      trechos: it.trechos.map((t) => {
        if (t.tipo === 'caminhada') return { ...t, de: nome(t.deId), para: nome(t.paraId) };
        const linha = catalogo.linha(t.linhaId)!;
        return {
          ...t,
          codigo: linha.codigo,
          cor: linha.cor,
          nomeLinha: linha.nome,
          destino: catalogo.destino(linha, t.sentido),
          embarque: nome(t.embarqueId),
          desembarque: nome(t.desembarqueId),
        };
      }),
    })),
  });
});
