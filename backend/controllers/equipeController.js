/**
 * controllers/equipeController.js
 */
const Equipe = require('../models/Equipe');
const { montarDashboardCompleto } = require('./dashboardController');

function emitirAtualizacao(req) {
  const io = req.app.get('io');
  if (io) io.emit('dashboard:atualizar', montarDashboardCompleto());
}

function listar(req, res) {
  res.json(Equipe.listarTodas());
}

function obterPorId(req, res) {
  const item = Equipe.buscarPorId(req.params.id);
  if (!item) return res.status(404).json({ erro: 'Equipe não encontrada.' });
  res.json(item);
}

function criar(req, res) {
  const { nome, cor } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Campo obrigatório: nome.' });
  const item = Equipe.criar({ nome, cor });
  emitirAtualizacao(req);
  res.status(201).json(item);
}

function atualizar(req, res) {
  const item = Equipe.atualizar(req.params.id, {
    nome: req.body.nome,
    cor: req.body.cor,
    ativo: req.body.ativo,
  });
  if (!item) return res.status(404).json({ erro: 'Equipe não encontrada.' });
  emitirAtualizacao(req);
  res.json(item);
}

function remover(req, res) {
  Equipe.remover(req.params.id);
  emitirAtualizacao(req);
  res.json({ sucesso: true });
}

module.exports = { listar, obterPorId, criar, atualizar, remover };
