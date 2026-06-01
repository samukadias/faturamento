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
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/notas', notasRouter);
app.use('/notasDebito', notasDebitoRouter);
app.use('/apontamento', apontamentoRouter);
app.use('/dePara', deParaRouter);
app.use('/kpis', kpisRouter);
app.use('/historico', historicoRouter);
app.use('/importar', importarRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Erro:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`📊 Endpoints disponíveis:`);
  console.log(`   GET  /notas`);
  console.log(`   GET  /notasDebito`);
  console.log(`   GET  /apontamento`);
  console.log(`   GET  /kpis`);
  console.log(`   GET  /historico`);
  console.log(`   POST /importar`);
  console.log(`   POST /auth/login\n`);
});

export default app;
