/**
 * config/db.js
 * ----------------------------------------------------------------------
 * Ponto unico de acesso ao banco de dados.
 *
 * Por padrao o projeto usa SQLite atraves do modulo nativo `node:sqlite`
 * (embutido no Node.js desde a v22.5 - nenhuma dependencia externa,
 * nenhuma compilacao nativa, funciona imediatamente apos "npm install").
 * O schema e compativel em conceito com database/database.sql
 * (PostgreSQL) - veja o README para o guia de migracao para producao.
 * ----------------------------------------------------------------------
 */

const path = require('path');
const fs = require('fs');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (e) {
  console.error('\n[erro] Este projeto requer Node.js 22.5 ou superior (modulo nativo "node:sqlite").');
  console.error(`       Versao atual detectada: ${process.version}`);
  console.error('       Atualize o Node.js e tente novamente. Veja o README para detalhes.\n');
  process.exit(1);
}

const DB_DIR = path.join(__dirname, '..', '..', 'database');
const DB_PATH = process.env.SQLITE_PATH
  ? path.join(__dirname, '..', '..', process.env.SQLITE_PATH.replace(/^\.\//, ''))
  : path.join(DB_DIR, 'jrc_ranking.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

module.exports = db;
