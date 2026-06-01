import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

// GET /historico
router.get('/', async (req: Request, res: Response) => {
  try {
    const { _limit = '24' } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(_limit) || 24, 100);

    const [data, total] = await Promise.all([
      prisma.historicoImportacao.findMany({ take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.historicoImportacao.count(),
    ]);

    res.set('X-Total-Count', String(total));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /historico — cria novo registro de histórico
router.post('/', async (req: Request, res: Response) => {
  try {
    const { mesReferencia, totalNF, totalND, totalApontamento, faturamentoTotal, usuario, status, observacao } = req.body;

    const hist = await prisma.historicoImportacao.create({
      data: {
        mesReferencia,
        totalNF: parseFloat(totalNF) || 0,
        totalND: parseFloat(totalND) || 0,
        totalApontamento: parseFloat(totalApontamento) || 0,
        faturamentoTotal: parseFloat(faturamentoTotal) || 0,
        usuario: usuario || 'sistema',
        status: status || 'COMPLETO',
        observacao: observacao || '',
      },
    });

    res.status(201).json(hist);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
