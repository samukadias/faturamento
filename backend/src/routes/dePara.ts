import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

// GET /dePara — com paginação
router.get('/', async (req: Request, res: Response) => {
  try {
    const { _limit = '500' } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(_limit) || 500, 100000);

    const [data, total] = await Promise.all([
      prisma.dePara.findMany({ take: limit, orderBy: { id: 'asc' } }),
      prisma.dePara.count(),
    ]);

    res.set('X-Total-Count', String(total));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
