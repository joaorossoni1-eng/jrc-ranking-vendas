/**
 * controllers/dashboardController.js
 * ----------------------------------------------------------------------
 * Concentra toda a lógica de agregação usada pelo painel:
 *   - ranking de coordenadores
 *   - disputa entre equipes/imobiliárias
 *   - ranking de empreendimentos
 *   - resumo geral (dashboard)
 *
 * Essas funções são reaproveitadas tanto pelas rotas REST quanto pelo
 * módulo de sockets (para reemitir o estado completo após cada alteração).
 * ----------------------------------------------------------------------
 */

const db = require('../config/db');

/** Ranking de vendas por coordenador, já ordenado e com posição/percentual. */
function calcularRankingCoordenadores() {
  const linhas = db
    .prepare(
      `SELECT
         c.id, c.nome, c.foto,
         eq.id AS equipe_id, eq.nome AS equipe_nome, eq.cor AS equipe_cor,
         COUNT(v.id) AS total_vendas,
         COALESCE(SUM(v.valor), 0) AS valor_total
       FROM coordenadores c
       JOIN equipes eq ON eq.id = c.equipe_id
       LEFT JOIN vendas v ON v.coordenador_id = c.id
       WHERE c.ativo = 1
       GROUP BY c.id
       ORDER BY total_vendas DESC, valor_total DESC, c.nome ASC`
    )
    .all();

  const totalGeral = linhas.reduce((soma, l) => soma + l.total_vendas, 0);

  return linhas.map((l, index) => ({
    posicao: index + 1,
    coordenador_id: l.id,
    nome: l.nome,
    foto: l.foto,
    equipe_id: l.equipe_id,
    equipe_nome: l.equipe_nome,
    equipe_cor: l.equipe_cor,
    total_vendas: l.total_vendas,
    valor_total: l.valor_total,
    percentual: totalGeral > 0 ? Number(((l.total_vendas / totalGeral) * 100).toFixed(1)) : 0,
  }));
}

/** Disputa entre as duas equipes/imobiliárias em destaque. */
function calcularDisputaEquipes() {
  const linhas = db
    .prepare(
      `SELECT
         eq.id, eq.nome, eq.cor,
         COUNT(v.id) AS total_vendas,
         COALESCE(SUM(v.valor), 0) AS valor_total
       FROM equipes eq
       LEFT JOIN vendas v ON v.equipe_id = eq.id
       WHERE eq.ativo = 1
       GROUP BY eq.id
       ORDER BY eq.id ASC`
    )
    .all();

  const totalGeral = linhas.reduce((soma, l) => soma + l.total_vendas, 0);

  const equipes = linhas.map((l) => ({
    equipe_id: l.id,
    nome: l.nome,
    cor: l.cor,
    total_vendas: l.total_vendas,
    valor_total: l.valor_total,
    percentual: totalGeral > 0 ? Number(((l.total_vendas / totalGeral) * 100).toFixed(1)) : 0,
  }));

  equipes.sort((a, b) => b.total_vendas - a.total_vendas);

  const [lider, desafiante] = equipes;
  const diferencaVendas = lider && desafiante ? lider.total_vendas - desafiante.total_vendas : 0;
  const diferencaPercentual = lider && desafiante ? Number((lider.percentual - desafiante.percentual).toFixed(1)) : 0;

  return {
    equipes,
    lider_id: lider && lider.total_vendas > 0 ? lider.equipe_id : null,
    empatado: lider && desafiante ? lider.total_vendas === desafiante.total_vendas : false,
    diferenca_vendas: Math.abs(diferencaVendas),
    diferenca_percentual: Math.abs(diferencaPercentual),
  };
}

/** Ranking de empreendimentos por quantidade de unidades vendidas. */
function calcularRankingEmpreendimentos() {
  const linhas = db
    .prepare(
      `SELECT
         emp.id, emp.nome, emp.meta_vendas,
         COUNT(v.id) AS total_vendas,
         COALESCE(SUM(v.valor), 0) AS valor_total
       FROM empreendimentos emp
       LEFT JOIN vendas v ON v.empreendimento_id = emp.id
       WHERE emp.ativo = 1
       GROUP BY emp.id
       ORDER BY total_vendas DESC, valor_total DESC`
    )
    .all();

  const maiorVolume = linhas.length ? linhas[0].total_vendas : 0;

  return linhas.map((l, index) => ({
    posicao: index + 1,
    empreendimento_id: l.id,
    nome: l.nome,
    meta_vendas: l.meta_vendas,
    total_vendas: l.total_vendas,
    valor_total: l.valor_total,
    percentual_meta: l.meta_vendas > 0 ? Number(((l.total_vendas / l.meta_vendas) * 100).toFixed(1)) : 0,
    percentual_relativo: maiorVolume > 0 ? Number(((l.total_vendas / maiorVolume) * 100).toFixed(1)) : 0,
  }));
}

/** Resumo completo usado no card de topo e nos cabeçalhos do painel. */
function calcularResumo() {
  const totais = db
    .prepare('SELECT COUNT(*) AS total_vendas, COALESCE(SUM(valor), 0) AS valor_total FROM vendas')
    .get();

  const ranking = calcularRankingCoordenadores();
  const rankingEmpreendimentos = calcularRankingEmpreendimentos();
  const disputa = calcularDisputaEquipes();

  const equipeLider = disputa.equipes.slice().sort((a, b) => b.total_vendas - a.total_vendas)[0];

  const ultimaVenda = db
    .prepare(
      `SELECT v.id, v.criado_em, v.valor, c.nome AS coordenador_nome, emp.nome AS empreendimento_nome
       FROM vendas v
       JOIN coordenadores c ON c.id = v.coordenador_id
       JOIN empreendimentos emp ON emp.id = v.empreendimento_id
       ORDER BY v.criado_em DESC, v.id DESC
       LIMIT 1`
    )
    .get();

  return {
    total_vendas: totais.total_vendas,
    valor_total: totais.valor_total,
    coordenador_lider: ranking[0] || null,
    equipe_lider: equipeLider || null,
    empreendimento_mais_vendido: rankingEmpreendimentos[0] || null,
    ultima_venda: ultimaVenda || null,
  };
}

/** Payload completo enviado ao carregar o painel e após qualquer alteração. */
function montarDashboardCompleto() {
  return {
    resumo: calcularResumo(),
    ranking_coordenadores: calcularRankingCoordenadores(),
    disputa_equipes: calcularDisputaEquipes(),
    ranking_empreendimentos: calcularRankingEmpreendimentos(),
    atualizado_em: new Date().toISOString(),
  };
}

// --- Handlers HTTP ---

function getRanking(req, res) {
  res.json(calcularRankingCoordenadores());
}

function getDisputaEquipes(req, res) {
  res.json(calcularDisputaEquipes());
}

function getRankingEmpreendimentos(req, res) {
  res.json(calcularRankingEmpreendimentos());
}

function getDashboard(req, res) {
  res.json(montarDashboardCompleto());
}

module.exports = {
  calcularRankingCoordenadores,
  calcularDisputaEquipes,
  calcularRankingEmpreendimentos,
  calcularResumo,
  montarDashboardCompleto,
  getRanking,
  getDisputaEquipes,
  getRankingEmpreendimentos,
  getDashboard,
};
