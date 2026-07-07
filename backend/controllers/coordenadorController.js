/**
 * controllers/coordenadorController.js
 */
const Coordenador = require('../models/Coordenador');
const { montarDashboardCompleto } = require('./dashboardController');

function emitirAtualizacao(req) {
  const io = req.app.get('io');
  if (io) io.emit('dashboard:atualizar', montarDashboardCompleto());
}

function listar(req, res) {
  res.json(Coordenador.listarTodos());
}

function obterPorId(req, res) {
  const item = Coordenador.buscarPorId(req.params.id);
  if (!item) return res.status(404).json({ erro: 'Coordenador não encontrado.' });
  res.json(item);
}

function criar(req, res) {
  const { nome, equipe_id, foto } = req.body;
  if (!nome || !equipe_id) {
    return res.status(400).json({ erro: 'Campos obrigatórios: nome, equipe_id.' });
  }
  const item = Coordenador.criar({ nome, equipe_id: Number(equipe_id), foto });
  emitirAtualizacao(req);
  res.status(201).json(item);
}

function atualizar(req, res) {
  const item = Coordenador.atualizar(req.params.id, {
    nome: req.body.nome,
    equipe_id: req.body.equipe_id !== undefined ? Number(req.body.equipe_id) : undefined,
    foto: req.body.foto,
    ativo: req.body.ativo,
  });
  if (!item) return res.status(404).json({ erro: 'Coordenador não encontrado.' });
  emitirAtualizacao(req);
  res.json(item);
}

function remover(req, res) {
  Coordenador.remover(req.params.id);
  emitirAtualizacao(req);
  res.json({ sucesso: true });
}

module.exports = { listar, obterPorId, criar, atualizar, remover };
