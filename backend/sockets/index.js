/**
 * sockets/index.js
 * Configura o servidor Socket.io: ao conectar, cada cliente recebe
 * imediatamente o estado atual do dashboard. Atualizações subsequentes
 * são emitidas pelos controllers (vendaController, coordenadorController,
 * etc.) via `req.app.get('io').emit(...)`.
 */

const { montarDashboardCompleto } = require('../controllers/dashboardController');

function configurarSockets(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] Cliente conectado: ${socket.id}`);

    // Envia o snapshot atual assim que o cliente conecta
    socket.emit('dashboard:atualizar', montarDashboardCompleto());

    socket.on('disconnect', () => {
      console.log(`[socket] Cliente desconectado: ${socket.id}`);
    });
  });
}

module.exports = { configurarSockets };
