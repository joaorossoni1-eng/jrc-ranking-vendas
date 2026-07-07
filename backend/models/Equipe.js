/**
 * models/Equipe.js
 * Acesso a dados da tabela `equipes`.
 */
const db = require('../config/db');

const Equipe = {
  listarTodas() {
    return db.prepare('SELECT * FROM equipes WHERE ativo = 1 ORDER BY nome').all();
  },

  buscarPorId(id) {
    return db.prepare('SELECT * FROM equipes WHERE id = ?').get(id);
  },

  criar({ nome, cor }) {
    const info = db
      .prepare('INSERT INTO equipes (nome, cor) VALUES (?, ?)')
      .run(nome, cor || '#0B1E3D');
    return this.buscarPorId(info.lastInsertRowid);
  },

  atualizar(id, { nome, cor, ativo }) {
    const atual = this.buscarPorId(id);
    if (!atual) return null;
    db.prepare('UPDATE equipes SET nome = ?, cor = ?, ativo = ? WHERE id = ?').run(
      nome ?? atual.nome,
      cor ?? atual.cor,
      ativo === undefined ? atual.ativo : ativo ? 1 : 0,
      id
    );
    return this.buscarPorId(id);
  },

  remover(id) {
    return db.prepare('UPDATE equipes SET ativo = 0 WHERE id = ?').run(id);
  },
};

module.exports = Equipe;
