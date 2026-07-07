/**
 * models/Coordenador.js
 * Acesso a dados da tabela `coordenadores`.
 */
const db = require('../config/db');

const Coordenador = {
  listarTodos() {
    return db
      .prepare(
        `SELECT c.*, e.nome AS equipe_nome, e.cor AS equipe_cor
         FROM coordenadores c
         JOIN equipes e ON e.id = c.equipe_id
         WHERE c.ativo = 1
         ORDER BY c.nome`
      )
      .all();
  },

  buscarPorId(id) {
    return db
      .prepare(
        `SELECT c.*, e.nome AS equipe_nome, e.cor AS equipe_cor
         FROM coordenadores c
         JOIN equipes e ON e.id = c.equipe_id
         WHERE c.id = ?`
      )
      .get(id);
  },

  criar({ nome, equipe_id, foto }) {
    const info = db
      .prepare('INSERT INTO coordenadores (nome, equipe_id, foto) VALUES (?, ?, ?)')
      .run(nome, equipe_id, foto || null);
    return this.buscarPorId(info.lastInsertRowid);
  },

  atualizar(id, { nome, equipe_id, foto, ativo }) {
    const atual = this.buscarPorId(id);
    if (!atual) return null;
    db.prepare(
      'UPDATE coordenadores SET nome = ?, equipe_id = ?, foto = ?, ativo = ? WHERE id = ?'
    ).run(
      nome ?? atual.nome,
      equipe_id ?? atual.equipe_id,
      foto === undefined ? atual.foto : foto,
      ativo === undefined ? atual.ativo : ativo ? 1 : 0,
      id
    );
    return this.buscarPorId(id);
  },

  remover(id) {
    return db.prepare('UPDATE coordenadores SET ativo = 0 WHERE id = ?').run(id);
  },
};

module.exports = Coordenador;
