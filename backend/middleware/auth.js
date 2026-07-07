/**
 * middleware/auth.js
 * Protege rotas administrativas exigindo um token válido emitido pelo
 * authController no header "Authorization: Bearer <token>".
 */
const { validarToken } = require('../controllers/authController');

function exigirAutenticacao(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const sessao = validarToken(token);
  if (!sessao) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
  req.usuario = sessao;
  next();
}

module.exports = { exigirAutenticacao };
