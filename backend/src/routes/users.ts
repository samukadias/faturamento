import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

// GET /users — com filtro por email
router.get('/', async (req: Request, res: Response) => {
  try {
    const { email } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (email) {
      where.email = email;
    }

    const users = await prisma.user.findMany({ where });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /users — criar usuário (caso necessário no futuro)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, password, nome, perfil } = req.body;
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nome,
        perfil: perfil === 'ADMIN' ? 'ADMIN' : 'VISUALIZADOR',
      },
    });

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
