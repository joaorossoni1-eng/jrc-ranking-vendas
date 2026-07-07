/**
 * models/Empreendimento.js
 * Acesso a dados da tabela `empreendimentos`.
 */
const db = require('../config/db');

const Empreendimento = {
  listarTodos() {
    return db.prepare('SELECT * FROM empreendimentos WHERE ativo = 1 ORDER BY nome').all();
  },

  buscarPorId(id) {
    return db.prepare('SELECT * FROM empreendimentos WHERE id = ?').get(id);
  },

  criar({ nome, imagem, meta_vendas }) {
    const info = db
      .prepare('INSERT INTO empreendimentos (nome, imagem, meta_vendas) VALUES (?, ?, ?)')
      .run(nome, imagem || null, meta_vendas || 0);
    return this.buscarPorId(info.lastInsertRowid);
  },

  atualizar(id, { nome, imagem, meta_vendas, ativo }) {
    const atual = this.buscarPorId(id);
    if (!atual) return null;
    db.prepare(
      'UPDATE empreendimentos SET nome = ?, imagem = ?, meta_vendas = ?, ativo = ? WHERE id = ?'
    ).run(
      nome ?? atual.nome,
      imagem === undefined ? atual.imagem : imagem,
      meta_vendas ?? atual.meta_vendas,
      ativo === undefined ? atual.ativo : ativo ? 1 : 0,
      id
    );
    return this.buscarPorId(id);
  },

  remover(id) {
    return db.prepare('UPDATE empreendimentos SET ativo = 0 WHERE id = ?').run(id);
  },
};

module.exports = Empreendimento;
