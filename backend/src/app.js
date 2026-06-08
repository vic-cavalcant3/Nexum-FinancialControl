require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth.routes');
const transacaoRoutes = require('./routes/transacao.routes');
const categoriaRoutes = require('./routes/categoria.routes');

const prisma = new PrismaClient();
const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

app.use((req, _res, next) => {
  req.prisma = prisma;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/transacoes', transacaoRoutes);
app.use('/api/categorias', categoriaRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use((_, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});