/**
 * models/Venda.js
 * Acesso a dados da tabela `vendas`, incluindo joins com coordenador,
 * equipe e empreendimento para facilitar a montagem das respostas da API.
 */
const db = require('../config/db');

const SELECT_BASE = `
  SELECT
    v.id, v.unidade, v.valor, v.data_venda, v.hora_venda,
    v.observacoes, v.criado_em, v.atualizado_em,
    c.id   AS coordenador_id, c.nome AS coordenador_nome, c.foto AS coordenador_foto,
    e.id   AS equipe_id,      e.nome AS equipe_nome,       e.cor  AS equipe_cor,
    emp.id AS empreendimento_id, emp.nome AS empreendimento_nome
  FROM vendas v
  JOIN coordenadores   c   ON c.id   = v.coordenador_id
  JOIN equipes         e   ON e.id   = v.equipe_id
  JOIN empreendimentos emp ON emp.id = v.empreendimento_id
`;

const Venda = {
  listarUltimas(limite = 10) {
    return db.prepare(`${SELECT_BASE} ORDER BY v.criado_em DESC, v.id DESC LIMIT ?`).all(limite);
  },

  listarComFiltros({ coordenador_id, equipe_id, empreendimento_id, data_inicio, data_fim, busca } = {}) {
    const condicoes = [];
    const params = [];

    if (coordenador_id) {
      condicoes.push('v.coordenador_id = ?');
      params.push(coordenador_id);
    }
    if (equipe_id) {
      condicoes.push('v.equipe_id = ?');
      params.push(equipe_id);
    }
    if (empreendimento_id) {
      condicoes.push('v.empreendimento_id = ?');
      params.push(empreendimento_id);
    }
    if (data_inicio) {
      condicoes.push('v.data_venda >= ?');
      params.push(data_inicio);
    }
    if (data_fim) {
      condicoes.push('v.data_venda <= ?');
      params.push(data_fim);
    }
    if (busca) {
      condicoes.push('(c.nome LIKE ? OR emp.nome LIKE ? OR v.unidade LIKE ?)');
      const termo = `%${busca}%`;
      params.push(termo, termo, termo);
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    return db
      .prepare(`${SELECT_BASE} ${where} ORDER BY v.data_venda DESC, v.criado_em DESC`)
      .all(...params);
  },

  buscarPorId(id) {
    return db.prepare(`${SELECT_BASE} WHERE v.id = ?`).get(id);
  },

  criar({ coordenador_id, empreendimento_id, unidade, valor, data_venda, hora_venda, observacoes }) {
    const coordenador = db.prepare('SELECT equipe_id FROM coordenadores WHERE id = ?').get(coordenador_id);
    if (!coordenador) throw new Error('Coordenador não encontrado');

    const agora = new Date();
    const horaFinal = hora_venda || agora.toTimeString().slice(0, 8);
    const criadoEm = agora.toISOString().replace('T', ' ').slice(0, 19);

    const info = db
      .prepare(
        `INSERT INTO vendas
          (coordenador_id, equipe_id, empreendimento_id, unidade, valor, data_venda, hora_venda, observacoes, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        coordenador_id,
        coordenador.equipe_id,
        empreendimento_id,
        unidade,
        valor,
        data_venda,
        horaFinal,
        observacoes || null,
        criadoEm,
        criadoEm
      );
    return this.buscarPorId(info.lastInsertRowid);
  },

  atualizar(id, dados) {
    const atual = this.buscarPorId(id);
    if (!atual) return null;

    let equipeId = atual.equipe_id;
    if (dados.coordenador_id && dados.coordenador_id !== atual.coordenador_id) {
      const coordenador = db.prepare('SELECT equipe_id FROM coordenadores WHERE id = ?').get(dados.coordenador_id);
      if (!coordenador) throw new Error('Coordenador não encontrado');
      equipeId = coordenador.equipe_id;
    }

    const agora = new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.prepare(
      `UPDATE vendas SET
        coordenador_id = ?, equipe_id = ?, empreendimento_id = ?, unidade = ?,
        valor = ?, data_venda = ?, hora_venda = ?, observacoes = ?, atualizado_em = ?
       WHERE id = ?`
    ).run(
      dados.coordenador_id ?? atual.coordenador_id,
      equipeId,
      dados.empreendimento_id ?? atual.empreendimento_id,
      dados.unidade ?? atual.unidade,
      dados.valor ?? atual.valor,
      dados.data_venda ?? atual.data_venda,
      dados.hora_venda ?? atual.hora_venda,
      dados.observacoes === undefined ? atual.observacoes : dados.observacoes,
      agora,
      id
    );
    return this.buscarPorId(id);
  },

  remover(id) {
    return db.prepare('DELETE FROM vendas WHERE id = ?').run(id);
  },

  contarTotal() {
    return db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(valor), 0) AS valor_total FROM vendas').get();
  },
};

module.exports = Venda;
