/**
 * database/seed.js
 * ----------------------------------------------------------------------
 * Popula o banco com dados iniciais.
 *
 * - Equipes e empreendimentos vêm dos espelhos de vendas da JRC anexados
 *   (Vista 289, Olympea Residence, Hublot Higienópolis, Corum Residence)
 *   mais "Gate Residence", citado no briefing do projeto.
 * - Coordenadores e o histórico de vendas de Julho/26 são dados
 *   FICTÍCIOS gerados apenas para demonstração do painel — edite-os
 *   livremente pelo painel administrativo (admin.html) ou direto no
 *   banco. Veja o README para instruções.
 *
 * O seed é idempotente: só roda se as tabelas estiverem vazias.
 * ----------------------------------------------------------------------
 */

const db = require('../config/db');
const { iniciarBanco } = require('./init');
const { hashSenha } = require('../utils/hash');

// Pequeno gerador pseudo-aleatório com semente fixa, para que os dados de
// demonstração sejam sempre os mesmos entre execuções (reprodutível).
function criarRng(semente) {
  let s = semente;
  return function rng() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function seedBanco() {
  iniciarBanco();

  const totalEquipes = db.prepare('SELECT COUNT(*) AS n FROM equipes').get().n;
  if (totalEquipes > 0) {
    return; // já populado
  }

  const rng = criarRng(42);
  const agora = new Date();

  const inserirEquipe = db.prepare('INSERT INTO equipes (nome, cor) VALUES (?, ?)');
  const idRioPreto = inserirEquipe.run('Empreendimentos Rio Preto', '#0B1E3D').lastInsertRowid;
  const idRenascer = inserirEquipe.run('Renascer & Jales JK', '#C9A227').lastInsertRowid;

  const inserirEmpreendimento = db.prepare(
    'INSERT INTO empreendimentos (nome, meta_vendas) VALUES (?, ?)'
  );
  const empreendimentos = [
    { nome: 'Vista 289', meta: 40, faixa: [440000, 511000] },
    { nome: 'Olympea Residence', meta: 30, faixa: [400000, 623000] },
    { nome: 'Hublot Higienópolis', meta: 15, faixa: [480000, 500000] },
    { nome: 'Corum Residence', meta: 25, faixa: [420000, 620000] },
    { nome: 'Gate Residence', meta: 20, faixa: [380000, 560000] },
  ].map((e) => ({ ...e, id: inserirEmpreendimento.run(e.nome, e.meta).lastInsertRowid }));

  const inserirCoordenador = db.prepare(
    'INSERT INTO coordenadores (nome, equipe_id, foto) VALUES (?, ?, ?)'
  );
  const coordenadores = [
    { nome: 'Ricardo Almeida', equipe: idRioPreto },
    { nome: 'Fernanda Souza', equipe: idRioPreto },
    { nome: 'Bruno Carvalho', equipe: idRioPreto },
    { nome: 'Juliana Martins', equipe: idRioPreto },
    { nome: 'Diego Ferreira', equipe: idRioPreto },
    { nome: 'Camila Rodrigues', equipe: idRenascer },
    { nome: 'Thiago Nogueira', equipe: idRenascer },
    { nome: 'Patrícia Lima', equipe: idRenascer },
    { nome: 'Rafael Torres', equipe: idRenascer },
    { nome: 'Aline Barbosa', equipe: idRenascer },
  ].map((c) => ({
    ...c,
    id: inserirCoordenador.run(c.nome, c.equipe, null).lastInsertRowid,
  }));

  const inserirUsuario = db.prepare(
    'INSERT INTO usuarios (login, senha_hash, nome, perfil) VALUES (?, ?, ?, ?)'
  );
  inserirUsuario.run('admin', hashSenha('jrc2026'), 'Administrador JRC', 'admin');

  // Pesos de distribuição por empreendimento (Vista 289 líder de vendas)
  const pesosEmpreendimento = [0.32, 0.24, 0.12, 0.2, 0.12];

  function sortearEmpreendimento() {
    const r = rng();
    let acc = 0;
    for (let i = 0; i < empreendimentos.length; i += 1) {
      acc += pesosEmpreendimento[i];
      if (r <= acc) return empreendimentos[i];
    }
    return empreendimentos[0];
  }

  function formatarData(d) {
    return d.toISOString().slice(0, 10);
  }

  function formatarHora(d) {
    return d.toTimeString().slice(0, 8);
  }

  const inserirVenda = db.prepare(`
    INSERT INTO vendas
      (coordenador_id, equipe_id, empreendimento_id, unidade, valor, data_venda, hora_venda, criado_em, atualizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Gera vendas para os últimos dias de Junho/26 até hoje (07/07/2026),
  // com volume crescente nos últimos dias para simular ritmo comercial real.
  const totalVendas = 54;
  const diasJanela = 12; // 26/06 a 07/07
  const inicioJanela = new Date(agora);
  inicioJanela.setDate(inicioJanela.getDate() - diasJanela);

  for (let i = 0; i < totalVendas; i += 1) {
    const coordenador = coordenadores[Math.floor(rng() * coordenadores.length)];
    const empreendimento = sortearEmpreendimento();
    const [min, max] = empreendimento.faixa;
    const valor = Math.round((min + rng() * (max - min)) / 100) * 100;

    const offsetDias = Math.floor(rng() * (diasJanela + 1));
    const dataVenda = new Date(inicioJanela);
    dataVenda.setDate(dataVenda.getDate() + offsetDias);
    // não gerar vendas no futuro além de hoje
    if (dataVenda > agora) dataVenda.setTime(agora.getTime());

    const hora = new Date(dataVenda);
    hora.setHours(8 + Math.floor(rng() * 11), Math.floor(rng() * 60), Math.floor(rng() * 60));

    const pavimento = 1 + Math.floor(rng() * 15);
    const unidadeNum = 100 * pavimento + (1 + Math.floor(rng() * 8));

    const criadoEm = hora.toISOString().replace('T', ' ').slice(0, 19);

    inserirVenda.run(
      coordenador.id,
      coordenador.equipe,
      empreendimento.id,
      String(unidadeNum),
      valor,
      formatarData(dataVenda),
      formatarHora(hora),
      criadoEm,
      criadoEm
    );
  }

  console.log('[seed] Banco populado com dados iniciais de demonstração.');
}

module.exports = { seedBanco };

if (require.main === module) {
  seedBanco();
  console.log('[seed] Concluído.');
}
