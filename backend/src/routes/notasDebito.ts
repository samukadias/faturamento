import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

// GET /notasDebito
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, _limit = '200' } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(_limit) || 200, 1000);

    const where: Record<string, unknown> = {};
    if (status && status !== 'TODOS') where.status = status;

    const [data, total] = await Promise.all([
      prisma.notaDebito.findMany({ where, take: limit, orderBy: { id: 'asc' } }),
      prisma.notaDebito.count({ where }),
    ]);

    res.set('X-Total-Count', String(total));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /notasDebito
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const { id, ...rest } = data;
    const nd = await prisma.notaDebito.create({
      data: {
        ...rest,
        valor: parseFloat(rest.valor) || 0,
        valorRecebido: parseFloat(rest.valorRecebido) || 0,
        saldoParcelas: parseFloat(rest.saldoParcelas) || 0,
      }
    });
    res.status(201).json(nd);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /notasDebito/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const { id: _, ...rest } = data;

    const existing = await prisma.notaDebito.findUnique({ where: { id } });
    if (!existing) {
      const created = await prisma.notaDebito.create({
        data: {
          id,
          ...rest,
          valor: parseFloat(rest.valor) || 0,
          valorRecebido: parseFloat(rest.valorRecebido) || 0,
          saldoParcelas: parseFloat(rest.saldoParcelas) || 0,
        }
      });
      res.json(created);
      return;
    }

    const updated = await prisma.notaDebito.update({
      where: { id },
      data: {
        ...rest,
        valor: parseFloat(rest.valor) || 0,
        valorRecebido: parseFloat(rest.valorRecebido) || 0,
        saldoParcelas: parseFloat(rest.saldoParcelas) || 0,
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
