import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import authRouter from './routes/auth';
import notasRouter from './routes/notas';
import notasDebitoRouter from './routes/notasDebito';
import apontamentoRouter from './routes/apontamento';
import deParaRouter from './routes/dePara';
import kpisRouter from './routes/kpis';
import historicoRouter from './routes/historico';
import importarRouter from './routes/importar';
import usersRouter from './routes/users';

const app = express();
const PORT = Number(process.env.PORT) || 80;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/notas', notasRouter);
app.use('/api/notasDebito', notasDebitoRouter);
app.use('/api/apontamento', apontamentoRouter);
app.use('/api/dePara', deParaRouter);
app.use('/api/kpis', kpisRouter);
app.use('/api/historico', historicoRouter);
app.use('/api/importar', importarRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Erro:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor Unificado rodando em http://0.0.0.0:${PORT}`);
  console.log(`📊 Endpoints disponíveis com prefixo /api`);
});

// Serve frontend estático
app.use(express.static(path.join(__dirname, '../../dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

export default app;
