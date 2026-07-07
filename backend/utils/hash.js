/**
 * utils/hash.js
 * Utilitário simples de hash de senha (SHA-256 + salt fixo do app).
 * Para um projeto de produção real, recomenda-se bcrypt/argon2 — aqui
 * optamos por SHA-256 nativo (sem dependências extras) para manter o
 * setup do projeto o mais simples possível.
 */

const crypto = require('crypto');

function hashSenha(senhaPura) {
  return crypto.createHash('sha256').update(String(senhaPura)).digest('hex');
}

module.exports = { hashSenha };
