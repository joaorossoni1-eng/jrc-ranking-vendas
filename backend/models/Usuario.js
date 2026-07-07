/**
 * models/Usuario.js
 * Acesso a dados da tabela `usuarios` (login do painel administrativo).
 */
const db = require('../config/db');

const Usuario = {
  buscarPorLogin(login) {
    return db.prepare('SELECT * FROM usuarios WHERE login = ? AND ativo = 1').get(login);
  },
};

module.exports = Usuario;
