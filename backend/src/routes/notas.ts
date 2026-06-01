import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

// GET /notas — com filtros, paginação e busca
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      _limit = '500',
      _page = '1',
      statusNF,
      origem,
      mesAno,
      razaoSocial,
      numContrato,
      classificacao,
    } = req.query as Record<string, string>;

    const limit = Math.min(parseInt(_limit) || 500, 100000);
    const page = parseInt(_page) || 1;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (statusNF && statusNF !== 'TODOS') where.statusNF = statusNF;
    if (origem && origem !== 'TODOS') where.origem = origem;
    if (mesAno) where.mesAno = mesAno;
    if (classificacao) where.classificacao = classificacao;
    if (razaoSocial) where.razaoSocial = { contains: razaoSocial, mode: 'insensitive' };
    if (numContrato) where.numContrato = { contains: numContrato, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      prisma.notaFiscal.findMany({ where, skip, take: limit, orderBy: { id: 'asc' } }),
      prisma.notaFiscal.count({ where }),
    ]);

    res.set('X-Total-Count', String(total));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /notas/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const nota = await prisma.notaFiscal.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!nota) { res.status(404).json({ error: 'Nota não encontrada' }); return; }
    res.json(nota);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /notas/resumo/por-origem — agrupamento para pivot table
router.get('/resumo/por-origem', async (req: Request, res: Response) => {
  try {
    const { statusNF = 'ABERTA' } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (statusNF !== 'TODOS') where.statusNF = statusNF;

    const result = await prisma.notaFiscal.groupBy({
      by: ['origem', 'mesAno'],
      where,
      _sum: { valorNotaFiscal: true },
      orderBy: [{ origem: 'asc' }, { mesAno: 'asc' }],
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /notas/resumo/por-cliente — ranking
router.get('/resumo/por-cliente', async (req: Request, res: Response) => {
  try {
    const { statusNF = 'ABERTA', origem } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (statusNF !== 'TODOS') where.statusNF = statusNF;
    if (origem && origem !== 'TODOS') where.origem = origem;

    const result = await prisma.notaFiscal.groupBy({
      by: ['razaoSocial', 'numContrato'],
      where,
      _sum: { valorNotaFiscal: true },
      orderBy: { _sum: { valorNotaFiscal: 'desc' } },
      take: 50,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /notas
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    // Remove id from payload if it exists to let autoincrement handle it or convert it
    const { id, ...rest } = data;
    const nota = await prisma.notaFiscal.create({
      data: {
        ...rest,
        valorNotaFiscal: parseFloat(rest.valorNotaFiscal) || 0,
        saldoParcelas: parseFloat(rest.saldoParcelas) || 0,
        valorRecebido: parseFloat(rest.valorRecebido) || 0,
        retencaoINSS: parseFloat(rest.retencaoINSS) || 0,
        retencaoISS: parseFloat(rest.retencaoISS) || 0,
        retencaoIRRF: parseFloat(rest.retencaoIRRF) || 0,
        retencaoPASEP: parseFloat(rest.retencaoPASEP) || 0,
        retencaoCOFINS: parseFloat(rest.retencaoCOFINS) || 0,
        retencaoCSSL: parseFloat(rest.retencaoCSSL) || 0,
        valorBruto: parseFloat(rest.valorBruto) || 0,
      }
    });
    res.status(201).json(nota);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /notas/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const { id: _, ...rest } = data;
    
    // Check if exists first
    const existing = await prisma.notaFiscal.findUnique({ where: { id } });
    if (!existing) {
      // Create if it doesn't exist to simulate PUT behavior of mock server
      const created = await prisma.notaFiscal.create({
        data: {
          id,
          ...rest,
          valorNotaFiscal: parseFloat(rest.valorNotaFiscal) || 0,
          saldoParcelas: parseFloat(rest.saldoParcelas) || 0,
          valorRecebido: parseFloat(rest.valorRecebido) || 0,
          retencaoINSS: parseFloat(rest.retencaoINSS) || 0,
          retencaoISS: parseFloat(rest.retencaoISS) || 0,
          retencaoIRRF: parseFloat(rest.retencaoIRRF) || 0,
          retencaoPASEP: parseFloat(rest.retencaoPASEP) || 0,
          retencaoCOFINS: parseFloat(rest.retencaoCOFINS) || 0,
          retencaoCSSL: parseFloat(rest.retencaoCSSL) || 0,
          valorBruto: parseFloat(rest.valorBruto) || 0,
        }
      });
      res.json(created);
      return;
    }

    const updated = await prisma.notaFiscal.update({
      where: { id },
      data: {
        ...rest,
        valorNotaFiscal: parseFloat(rest.valorNotaFiscal) || 0,
        saldoParcelas: parseFloat(rest.saldoParcelas) || 0,
        valorRecebido: parseFloat(rest.valorRecebido) || 0,
        retencaoINSS: parseFloat(rest.retencaoINSS) || 0,
        retencaoISS: parseFloat(rest.retencaoISS) || 0,
        retencaoIRRF: parseFloat(rest.retencaoIRRF) || 0,
        retencaoPASEP: parseFloat(rest.retencaoPASEP) || 0,
        retencaoCOFINS: parseFloat(rest.retencaoCOFINS) || 0,
        retencaoCSSL: parseFloat(rest.retencaoCSSL) || 0,
        valorBruto: parseFloat(rest.valorBruto) || 0,
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /notas/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.notaFiscal.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
