/**
 * controllers/empreendimentoController.js
 */
const Empreendimento = require('../models/Empreendimento');
const { montarDashboardCompleto } = require('./dashboardController');

function emitirAtualizacao(req) {
  const io = req.app.get('io');
  if (io) io.emit('dashboard:atualizar', montarDashboardCompleto());
}

function listar(req, res) {
  res.json(Empreendimento.listarTodos());
}

function obterPorId(req, res) {
  const item = Empreendimento.buscarPorId(req.params.id);
  if (!item) return res.status(404).json({ erro: 'Empreendimento não encontrado.' });
  res.json(item);
}

function criar(req, res) {
  const { nome, imagem, meta_vendas } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Campo obrigatório: nome.' });
  const item = Empreendimento.criar({ nome, imagem, meta_vendas: Number(meta_vendas) || 0 });
  emitirAtualizacao(req);
  res.status(201).json(item);
}

function atualizar(req, res) {
  const item = Empreendimento.atualizar(req.params.id, {
    nome: req.body.nome,
    imagem: req.body.imagem,
    meta_vendas: req.body.meta_vendas !== undefined ? Number(req.body.meta_vendas) : undefined,
    ativo: req.body.ativo,
  });
  if (!item) return res.status(404).json({ erro: 'Empreendimento não encontrado.' });
  emitirAtualizacao(req);
  res.json(item);
}

function remover(req, res) {
  Empreendimento.remover(req.params.id);
  emitirAtualizacao(req);
  res.json({ sucesso: true });
}

module.exports = { listar, obterPorId, criar, atualizar, remover };
