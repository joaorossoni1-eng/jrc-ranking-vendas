/**
 * controllers/vendaController.js
 * CRUD de vendas + emissão de eventos em tempo real via Socket.io sempre
 * que o estado do banco muda (cadastro, edição ou exclusão de venda).
 */

const Venda = require('../models/Venda');
const { montarDashboardCompleto } = require('./dashboardController');

/** Reenvia o estado completo do painel para todos os clientes conectados. */
function emitirAtualizacao(req, eventoOrigem, dadosEvento) {
  const io = req.app.get('io');
  if (!io) return;
  if (eventoOrigem && dadosEvento) {
    io.emit(eventoOrigem, dadosEvento);
  }
  io.emit('dashboard:atualizar', montarDashboardCompleto());
}

function validarCamposVenda(body, { exigirTodos }) {
  const obrigatorios = ['coordenador_id', 'empreendimento_id', 'unidade', 'valor', 'data_venda'];
  if (!exigirTodos) return null;
  for (const campo of obrigatorios) {
    if (body[campo] === undefined || body[campo] === null || body[campo] === '') {
      return `Campo obrigatório ausente: ${campo}`;
    }
  }
  if (Number.isNaN(Number(body.valor)) || Number(body.valor) <= 0) {
    return 'O valor da venda deve ser um número maior que zero.';
  }
  return null;
}

function listar(req, res) {
  const { coordenador_id, equipe_id, empreendimento_id, data_inicio, data_fim, busca } = req.query;
  const vendas = Venda.listarComFiltros({
    coordenador_id, equipe_id, empreendimento_id, data_inicio, data_fim, busca,
  });
  res.json(vendas);
}

function ultimas(req, res) {
  const limite = Number(req.query.limite) || 10;
  res.json(Venda.listarUltimas(limite));
}

function obterPorId(req, res) {
  const venda = Venda.buscarPorId(req.params.id);
  if (!venda) return res.status(404).json({ erro: 'Venda não encontrada.' });
  res.json(venda);
}

function criar(req, res) {
  const erro = validarCamposVenda(req.body, { exigirTodos: true });
  if (erro) return res.status(400).json({ erro });

  try {
    const venda = Venda.criar({
      coordenador_id: Number(req.body.coordenador_id),
      empreendimento_id: Number(req.body.empreendimento_id),
      unidade: String(req.body.unidade),
      valor: Number(req.body.valor),
      data_venda: req.body.data_venda,
      hora_venda: req.body.hora_venda,
      observacoes: req.body.observacoes,
    });
    emitirAtualizacao(req, 'venda:nova', venda);
    res.status(201).json(venda);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
}

function atualizar(req, res) {
  const existente = Venda.buscarPorId(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Venda não encontrada.' });

  try {
    const venda = Venda.atualizar(req.params.id, {
      coordenador_id: req.body.coordenador_id !== undefined ? Number(req.body.coordenador_id) : undefined,
      empreendimento_id: req.body.empreendimento_id !== undefined ? Number(req.body.empreendimento_id) : undefined,
      unidade: req.body.unidade,
      valor: req.body.valor !== undefined ? Number(req.body.valor) : undefined,
      data_venda: req.body.data_venda,
      hora_venda: req.body.hora_venda,
      observacoes: req.body.observacoes,
    });
    emitirAtualizacao(req, 'venda:atualizada', venda);
    res.json(venda);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
}

function remover(req, res) {
  const existente = Venda.buscarPorId(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Venda não encontrada.' });

  Venda.remover(req.params.id);
  emitirAtualizacao(req, 'venda:removida', { id: Number(req.params.id) });
  res.json({ sucesso: true });
}

module.exports = { listar, ultimas, obterPorId, criar, atualizar, remover };
