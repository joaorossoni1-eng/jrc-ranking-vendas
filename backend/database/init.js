/**
 * database/init.js
 * ----------------------------------------------------------------------
 * Cria (se necessário) todas as tabelas do banco SQLite. Espelha o schema
 * definido em database/database.sql (versão PostgreSQL).
 * ----------------------------------------------------------------------
 */

const db = require('../config/db');

function iniciarBanco() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS equipes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL UNIQUE,
      cor         TEXT    NOT NULL DEFAULT '#0B1E3D',
      logo        TEXT,
      ativo       INTEGER NOT NULL DEFAULT 1,
      criado_em   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coordenadores (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL,
      foto        TEXT,
      equipe_id   INTEGER NOT NULL REFERENCES equipes(id),
      ativo       INTEGER NOT NULL DEFAULT 1,
      criado_em   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_coordenadores_equipe ON coordenadores(equipe_id);

    CREATE TABLE IF NOT EXISTS empreendimentos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nome          TEXT    NOT NULL UNIQUE,
      imagem        TEXT,
      meta_vendas   INTEGER NOT NULL DEFAULT 0,
      ativo         INTEGER NOT NULL DEFAULT 1,
      criado_em     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      login        TEXT    NOT NULL UNIQUE,
      senha_hash   TEXT    NOT NULL,
      nome         TEXT    NOT NULL,
      perfil       TEXT    NOT NULL DEFAULT 'admin',
      ativo        INTEGER NOT NULL DEFAULT 1,
      criado_em    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vendas (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      coordenador_id     INTEGER NOT NULL REFERENCES coordenadores(id),
      equipe_id          INTEGER NOT NULL REFERENCES equipes(id),
      empreendimento_id  INTEGER NOT NULL REFERENCES empreendimentos(id),
      unidade            TEXT    NOT NULL,
      valor              REAL    NOT NULL DEFAULT 0,
      data_venda         TEXT    NOT NULL,
      hora_venda         TEXT    NOT NULL DEFAULT (time('now', 'localtime')),
      observacoes        TEXT,
      criado_em          TEXT    NOT NULL DEFAULT (datetime('now')),
      atualizado_em      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_vendas_coordenador    ON vendas(coordenador_id);
    CREATE INDEX IF NOT EXISTS idx_vendas_equipe         ON vendas(equipe_id);
    CREATE INDEX IF NOT EXISTS idx_vendas_empreendimento ON vendas(empreendimento_id);
    CREATE INDEX IF NOT EXISTS idx_vendas_data           ON vendas(data_venda);
  `);
}

module.exports = { iniciarBanco };
