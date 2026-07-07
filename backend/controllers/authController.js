/**
 * controllers/authController.js
 * ----------------------------------------------------------------------
 * Autenticação simples e independente de banco extra: gera um token
 * opaco em memória a cada login bem-sucedido (válido por 12h) e o
 * middleware auth.js valida esse token nas rotas administrativas.
 *
 * É suficiente para um painel interno de uma única empresa. Para uso em
 * produção com múltiplos administradores/sessões persistentes, troque
 * por JWT + refresh tokens ou uma lib como express-session.
 * ----------------------------------------------------------------------
 */

const crypto = require('crypto');
const Usuario = require('../models/Usuario');
const { hashSenha } = require('../utils/hash');

const TOKENS = new Map(); // token -> { login, nome, perfil, expiraEm }
const DURACAO_TOKEN_MS = 12 * 60 * 60 * 1000; // 12 horas

function login(req, res) {
  const { login: loginUsuario, senha } = req.body;
  if (!loginUsuario || !senha) {
    return res.status(400).json({ erro: 'Informe login e senha.' });
  }

  const usuario = Usuario.buscarPorLogin(loginUsuario);
  if (!usuario || usuario.senha_hash !== hashSenha(senha)) {
    return res.status(401).json({ erro: 'Login ou senha inválidos.' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  TOKENS.set(token, {
    login: usuario.login,
    nome: usuario.nome,
    perfil: usuario.perfil,
    expiraEm: Date.now() + DURACAO_TOKEN_MS,
  });

  res.json({
    token,
    usuario: { login: usuario.login, nome: usuario.nome, perfil: usuario.perfil },
  });
}

function logout(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  TOKENS.delete(token);
  res.json({ sucesso: true });
}

function validarToken(token) {
  const sessao = TOKENS.get(token);
  if (!sessao) return null;
  if (sessao.expiraEm < Date.now()) {
    TOKENS.delete(token);
    return null;
  }
  return sessao;
}

module.exports = { login, logout, validarToken };
