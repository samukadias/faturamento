import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

// GET /apontamento — com paginação e filtros opcionais
router.get('/', async (req: Request, res: Response) => {
  try {
    const { _limit = '2000', mes, ano, cliente } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(_limit) || 2000, 100000);

    const where: Record<string, unknown> = {};
    if (mes) where.mes = parseInt(mes);
    if (ano) where.ano = parseInt(ano);
    if (cliente) where.cliente = { contains: cliente, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.apontamento.findMany({ where, take: limit, orderBy: { id: 'asc' } }),
      prisma.apontamento.count({ where }),
    ]);

    res.set('X-Total-Count', String(total));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /apontamento
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const { id, ...rest } = data;
    const ap = await prisma.apontamento.create({
      data: {
        ...rest,
        mes: rest.mes ? parseInt(rest.mes) : null,
        ano: rest.ano ? parseInt(rest.ano) : null,
        qtdeApontada: parseFloat(rest.qtdeApontada) || 0,
        precoUnitario: parseFloat(rest.precoUnitario) || 0,
        valorTotal: parseFloat(rest.valorTotal) || 0,
      }
    });
    res.status(201).json(ap);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /apontamento/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const { id: _, ...rest } = data;

    const existing = await prisma.apontamento.findUnique({ where: { id } });
    if (!existing) {
      const created = await prisma.apontamento.create({
        data: {
          id,
          ...rest,
          mes: rest.mes ? parseInt(rest.mes) : null,
          ano: rest.ano ? parseInt(rest.ano) : null,
          qtdeApontada: parseFloat(rest.qtdeApontada) || 0,
          precoUnitario: parseFloat(rest.precoUnitario) || 0,
          valorTotal: parseFloat(rest.valorTotal) || 0,
        }
      });
      res.json(created);
      return;
    }

    const updated = await prisma.apontamento.update({
      where: { id },
      data: {
        ...rest,
        mes: rest.mes ? parseInt(rest.mes) : null,
        ano: rest.ano ? parseInt(rest.ano) : null,
        qtdeApontada: parseFloat(rest.qtdeApontada) || 0,
        precoUnitario: parseFloat(rest.precoUnitario) || 0,
        valorTotal: parseFloat(rest.valorTotal) || 0,
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
