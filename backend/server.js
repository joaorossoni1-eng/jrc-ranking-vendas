/**
 * server.js
 * ----------------------------------------------------------------------
 * Ponto de entrada do backend do Painel de Ranking de Vendas JRC.
 *
 * Responsabilidades:
 *   1. Inicializar/popular o banco SQLite (primeira execução);
 *   2. Configurar o Express (API REST em /api/*);
 *   3. Servir o frontend estático (/frontend);
 *   4. Configurar o Socket.io para atualizações em tempo real.
 * ----------------------------------------------------------------------
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const { seedBanco } = require('./database/seed');
const { configurarSockets } = require('./sockets');

// Rotas
const rankingRoutes = require('./routes/ranking');
const coordenadoresRoutes = require('./routes/coordenadores');
const equipesRoutes = require('./routes/equipes');
const empreendimentosRoutes = require('./routes/empreendimentos');
const vendasRoutes = require('./routes/vendas');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const vendaController = require('./controllers/vendaController');
const { exigirAutenticacao } = require('./middleware/auth');

// ---------------------------------------------------------------------
// 1. Banco de dados
// ---------------------------------------------------------------------
seedBanco();

// ---------------------------------------------------------------------
// 2. Express + Socket.io
// ---------------------------------------------------------------------
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.set('io', io); // disponível em req.app.get('io') dentro dos controllers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log simples de requisições da API
app.use('/api', (req, res, next) => {
  console.log(`[api] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------------------------------------------------------------------
// Rotas da API REST
// ---------------------------------------------------------------------
app.use('/api/ranking', rankingRoutes);
app.use('/api/coordenadores', coordenadoresRoutes);
app.use('/api/equipes', equipesRoutes);
app.use('/api/empreendimentos', empreendimentosRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);

// Aliases literais pedidos no briefing do projeto
app.get('/api/ultimas-vendas', vendaController.ultimas);
app.post('/api/venda', exigirAutenticacao, vendaController.criar);
app.put('/api/venda/:id', exigirAutenticacao, vendaController.atualizar);
app.delete('/api/venda/:id', exigirAutenticacao, vendaController.remover);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', horario: new Date().toISOString() });
});

// ---------------------------------------------------------------------
// 3. Frontend estático
// ---------------------------------------------------------------------
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// 404 para rotas de API não encontradas
app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Endpoint não encontrado.' });
});

// Tratamento de erros genérico
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[erro]', err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// ---------------------------------------------------------------------
// 4. Socket.io
// ---------------------------------------------------------------------
configurarSockets(io);

// ---------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------
const PORTA = process.env.PORT || 3000;
server.listen(PORTA, () => {
  console.log('==========================================================');
  console.log('  JRC — Painel de Ranking de Vendas');
  console.log(`  Painel:  http://localhost:${PORTA}`);
  console.log(`  Admin:   http://localhost:${PORTA}/admin`);
  console.log(`  API:     http://localhost:${PORTA}/api/dashboard`);
  console.log('==========================================================');
});

module.exports = { app, server };
