import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

// GET /kpis — estatísticas básicas calculadas no servidor
router.get('/', async (req: Request, res: Response) => {
  try {
    const [totalNF, totalND, totalAp, countNF, countND, countAp] = await Promise.all([
      prisma.notaFiscal.aggregate({
        where: { statusNF: 'ABERTA' },
        _sum: { valorNotaFiscal: true }
      }),
      prisma.notaDebito.aggregate({
        where: { status: 'ABERTA' },
        _sum: { valor: true }
      }),
      prisma.apontamento.aggregate({
        _sum: { valorTotal: true }
      }),
      prisma.notaFiscal.count(),
      prisma.notaDebito.count(),
      prisma.apontamento.count(),
    ]);

    const sumNF = totalNF._sum.valorNotaFiscal || 0;
    const sumND = totalND._sum.valor || 0;
    const sumAp = totalAp._sum.valorTotal || 0;

    res.json({
      sumNF,
      sumND,
      sumAp,
      countNF,
      countND,
      countAp,
      faturamentoTotal: sumNF + sumND
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
