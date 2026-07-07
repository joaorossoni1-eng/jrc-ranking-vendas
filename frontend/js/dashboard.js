/**
 * js/dashboard.js
 * ----------------------------------------------------------------------
 * Lógica do painel principal (index.html):
 *   - Conecta ao Socket.io e recebe atualizações em tempo real;
 *   - Faz fallback para polling a cada 5s caso o socket caia;
 *   - Renderiza resumo, ranking de coordenadores, disputa de equipes,
 *     ranking de empreendimentos e últimas vendas;
 *   - Detecta mudanças (subida de posição, nova venda, troca de
 *     liderança) para disparar as animações correspondentes.
 * ----------------------------------------------------------------------
 */

(function () {
  'use strict';

  const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

  const formatadorMoedaCompleta = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const formatadorData = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  // Estado anterior, usado para detectar mudanças e animar
  let estadoAnterior = {
    posicaoPorCoordenador: new Map(),
    liderEquipe: null,
    ultimaVendaId: null,
  };

  let pollingTimer = null;
  const INTERVALO_POLLING_MS = 5000;

  // ---------------------------------------------------------------------
  // Relógio e data
  // ---------------------------------------------------------------------
  function atualizarRelogio() {
    const agora = new Date();
    document.getElementById('horaAtual').textContent = agora.toLocaleTimeString('pt-BR');
    const dataFormatada = formatadorData.format(agora);
    document.getElementById('dataAtual').textContent =
      dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  }
  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);

  // ---------------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------------
  function iniciais(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/);
    return (partes[0][0] + (partes[1] ? partes[1][0] : '')).toUpperCase();
  }

  function animarNumero(elemento, valorFinal, formatador) {
    const valorInicial = Number(elemento.dataset.valorAtual || 0);
    if (valorInicial === valorFinal) {
      elemento.textContent = formatador ? formatador(valorFinal) : valorFinal;
      return;
    }
    const duracao = 800;
    const inicio = performance.now();

    function passo(tempoAtual) {
      const progresso = Math.min((tempoAtual - inicio) / duracao, 1);
      const facilitado = 1 - Math.pow(1 - progresso, 3);
      const valorAtual = Math.round(valorInicial + (valorFinal - valorInicial) * facilitado);
      elemento.textContent = formatador ? formatador(valorAtual) : valorAtual;
      if (progresso < 1) {
        requestAnimationFrame(passo);
      } else {
        elemento.dataset.valorAtual = valorFinal;
      }
    }
    requestAnimationFrame(passo);
  }

  // ---------------------------------------------------------------------
  // Renderização: resumo
  // ---------------------------------------------------------------------
  function renderizarResumo(dados) {
    const { resumo } = dados;

    animarNumero(document.getElementById('totalGeralVendas'), resumo.total_vendas);

    document.getElementById('resumoCoordenadorLider').textContent =
      resumo.coordenador_lider ? resumo.coordenador_lider.nome : '—';

    document.getElementById('resumoEquipeLider').textContent =
      resumo.equipe_lider ? resumo.equipe_lider.nome : '—';

    document.getElementById('resumoEmpreendimentoTop').textContent =
      resumo.empreendimento_mais_vendido ? resumo.empreendimento_mais_vendido.nome : '—';

    document.getElementById('resumoValorTotal').textContent =
      formatadorMoeda.format(resumo.valor_total || 0);

    const ultimaVendaEl = document.getElementById('resumoUltimaVenda');
    if (resumo.ultima_venda) {
      const v = resumo.ultima_venda;
      ultimaVendaEl.textContent = `${v.coordenador_nome} · ${v.empreendimento_nome}`;
    } else {
      ultimaVendaEl.textContent = '—';
    }
  }

  // ---------------------------------------------------------------------
  // Renderização: ranking de coordenadores
  // ---------------------------------------------------------------------
  const MEDALHAS = ['🏆', '🥈', '🥉'];

  function renderizarRankingCoordenadores(lista) {
    const container = document.getElementById('rankingCoordenadores');
    const novaPosicaoPorCoordenador = new Map();

    container.innerHTML = '';

    lista.forEach((item) => {
      novaPosicaoPorCoordenador.set(item.coordenador_id, item.posicao);

      const posicaoAnterior = estadoAnterior.posicaoPorCoordenador.get(item.coordenador_id);
      const subiu = posicaoAnterior !== undefined && item.posicao < posicaoAnterior;

      const el = document.createElement('div');
      const classeTop = item.posicao === 1 ? 'ranking-item--top1'
        : item.posicao === 2 ? 'ranking-item--top2'
        : item.posicao === 3 ? 'ranking-item--top3' : '';
      el.className = `ranking-item ${classeTop} ${subiu ? 'ranking-item--subiu' : ''}`.trim();

      const medalha = item.posicao <= 3 ? `<span class="ranking-item__medalha">${MEDALHAS[item.posicao - 1]}</span>` : '';
      const avatarConteudo = item.foto
        ? `<img src="${item.foto}" alt="${item.nome}" />`
        : iniciais(item.nome);

      el.innerHTML = `
        ${medalha}
        <div class="ranking-item__posicao">${item.posicao}º</div>
        <div class="ranking-item__avatar">${avatarConteudo}</div>
        <div class="ranking-item__info">
          <span class="ranking-item__nome">${item.nome}</span>
          <span class="ranking-item__equipe">
            <span class="ranking-item__equipe-dot" style="background:${item.equipe_cor}"></span>
            ${item.equipe_nome}
          </span>
          <div class="ranking-item__barra-track">
            <div class="ranking-item__barra-fill" style="width:0%"></div>
          </div>
        </div>
        <div></div>
        <div class="ranking-item__numeros">
          <div class="ranking-item__qtd">${item.total_vendas}</div>
          <div class="ranking-item__pct">${item.percentual}%</div>
        </div>
      `;

      container.appendChild(el);

      // Anima a barra de progresso após inserir no DOM
      requestAnimationFrame(() => {
        const fill = el.querySelector('.ranking-item__barra-fill');
        if (fill) fill.style.width = `${Math.min(item.percentual, 100)}%`;
      });
    });

    estadoAnterior.posicaoPorCoordenador = novaPosicaoPorCoordenador;
  }

  // ---------------------------------------------------------------------
  // Renderização: disputa entre imobiliárias
  // ---------------------------------------------------------------------
  function renderizarDisputa(disputa) {
    const container = document.getElementById('disputaEquipes');
    const [equipeA, equipeB] = disputa.equipes;
    if (!equipeA || !equipeB) {
      container.innerHTML = '<p style="color:var(--cinza-400);font-size:13px;">Cadastre as duas equipes para exibir a disputa.</p>';
      return;
    }

    const totalDupla = equipeA.total_vendas + equipeB.total_vendas;
    const pctA = totalDupla > 0 ? (equipeA.total_vendas / totalDupla) * 100 : 50;
    const pctB = totalDupla > 0 ? (equipeB.total_vendas / totalDupla) * 100 : 50;

    const houveTrocaLideranca =
      estadoAnterior.liderEquipe !== null &&
      disputa.lider_id !== null &&
      estadoAnterior.liderEquipe !== disputa.lider_id;

    container.innerHTML = `
      <div class="disputa-times ${houveTrocaLideranca ? 'disputa-mudou-lideranca' : ''}">
        <div class="disputa-time ${disputa.lider_id === equipeA.equipe_id ? 'disputa-time--lider' : ''}">
          <span class="disputa-time__coroa">👑</span>
          <div class="disputa-time__nome">${equipeA.nome}</div>
          <div class="disputa-time__qtd" style="color:${equipeA.cor}">${equipeA.total_vendas}</div>
          <div class="disputa-time__pct">${equipeA.percentual}% do total</div>
        </div>
        <div class="disputa-vs">VS</div>
        <div class="disputa-time ${disputa.lider_id === equipeB.equipe_id ? 'disputa-time--lider' : ''}">
          <span class="disputa-time__coroa">👑</span>
          <div class="disputa-time__nome">${equipeB.nome}</div>
          <div class="disputa-time__qtd" style="color:${equipeB.cor}">${equipeB.total_vendas}</div>
          <div class="disputa-time__pct">${equipeB.percentual}% do total</div>
        </div>
      </div>
      <div class="disputa-barra-track">
        <div class="disputa-barra-a" style="width:0%; background:${equipeA.cor}"></div>
        <div class="disputa-barra-b" style="width:0%; background:${equipeB.cor}"></div>
      </div>
      <div class="disputa-info">
        <span>${disputa.empatado ? 'Empate técnico no momento' : `Diferença: <strong>${disputa.diferenca_vendas} vendas</strong>`}</span>
        <span>${disputa.empatado ? '' : `${disputa.diferenca_percentual}% de vantagem`}</span>
      </div>
    `;

    requestAnimationFrame(() => {
      const barraA = container.querySelector('.disputa-barra-a');
      const barraB = container.querySelector('.disputa-barra-b');
      if (barraA) barraA.style.width = `${pctA}%`;
      if (barraB) barraB.style.width = `${pctB}%`;
    });

    estadoAnterior.liderEquipe = disputa.lider_id;
  }

  // ---------------------------------------------------------------------
  // Renderização: ranking de empreendimentos
  // ---------------------------------------------------------------------
  function renderizarEmpreendimentos(lista) {
    const container = document.getElementById('rankingEmpreendimentos');
    container.innerHTML = '';

    lista.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'empreendimento-item';
      el.innerHTML = `
        <div class="empreendimento-item__topo">
          <span class="empreendimento-item__nome">
            <span class="empreendimento-item__posicao">${item.posicao}º</span> ${item.nome}
          </span>
          <span class="empreendimento-item__qtd">${item.total_vendas}${item.meta_vendas ? ` / ${item.meta_vendas}` : ''}</span>
        </div>
        <div class="empreendimento-item__barra-track">
          <div class="empreendimento-item__barra-fill" style="width:0%"></div>
        </div>
      `;
      container.appendChild(el);
      requestAnimationFrame(() => {
        const fill = el.querySelector('.empreendimento-item__barra-fill');
        const pct = item.meta_vendas ? item.percentual_meta : item.percentual_relativo;
        if (fill) fill.style.width = `${Math.min(pct, 100)}%`;
      });
    });
  }

  // ---------------------------------------------------------------------
  // Renderização: últimas vendas
  // ---------------------------------------------------------------------
  function renderizarUltimasVendas(lista) {
    const container = document.getElementById('ultimasVendas');
    container.innerHTML = '';

    const primeiraVendaId = lista.length ? lista[0].id : null;

    lista.slice(0, 10).forEach((venda) => {
      const el = document.createElement('div');
      const ehNova = estadoAnterior.ultimaVendaId !== null && venda.id > estadoAnterior.ultimaVendaId;
      el.className = `venda-item ${ehNova ? 'venda-item--nova' : ''}`.trim();
      el.innerHTML = `
        <span class="venda-item__hora">${venda.hora_venda ? venda.hora_venda.slice(0, 5) : '--:--'}</span>
        <span class="venda-item__detalhes">
          <span class="venda-item__coordenador">${venda.coordenador_nome}</span>
          <span class="venda-item__empreendimento">${venda.equipe_nome} · ${venda.empreendimento_nome} · Un. ${venda.unidade}</span>
        </span>
        <span class="venda-item__valor">${formatadorMoeda.format(venda.valor)}</span>
      `;
      container.appendChild(el);
    });

    if (primeiraVendaId !== null) {
      estadoAnterior.ultimaVendaId = primeiraVendaId;
    }
  }

  // ---------------------------------------------------------------------
  // Toast de nova venda
  // ---------------------------------------------------------------------
  function mostrarToastVenda(venda) {
    const container = document.getElementById('toastVenda');
    const el = document.createElement('div');
    el.className = 'toast-venda__item';
    el.innerHTML = `
      <div class="toast-venda__titulo">🎉 Nova venda registrada!</div>
      <div class="toast-venda__corpo">
        <strong>${venda.coordenador_nome}</strong> vendeu a unidade ${venda.unidade} em
        <strong>${venda.empreendimento_nome}</strong> — ${formatadorMoedaCompleta.format(venda.valor)}
      </div>
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 5200);
  }

  // ---------------------------------------------------------------------
  // Orquestração: aplica um snapshot completo do dashboard
  // ---------------------------------------------------------------------
  function aplicarSnapshot(dados) {
    renderizarResumo(dados);
    renderizarRankingCoordenadores(dados.ranking_coordenadores);
    renderizarDisputa(dados.disputa_equipes);
    renderizarEmpreendimentos(dados.ranking_empreendimentos);
  }

  async function buscarUltimasVendas() {
    try {
      const resposta = await fetch('/api/vendas/ultimas?limite=10');
      const lista = await resposta.json();
      renderizarUltimasVendas(lista);
    } catch (erro) {
      console.error('[dashboard] Falha ao buscar últimas vendas:', erro);
    }
  }

  async function buscarDashboardCompleto() {
    try {
      const resposta = await fetch('/api/dashboard');
      const dados = await resposta.json();
      aplicarSnapshot(dados);
      await buscarUltimasVendas();
    } catch (erro) {
      console.error('[dashboard] Falha ao buscar dashboard:', erro);
    }
  }

  // ---------------------------------------------------------------------
  // Conexão em tempo real (Socket.io) com fallback de polling
  // ---------------------------------------------------------------------
  function definirStatusConexao(conectado) {
    const pill = document.getElementById('statusConexao');
    const label = pill.querySelector('.status-pill__label');
    pill.classList.toggle('conectado', conectado);
    label.textContent = conectado ? 'Tempo real ativo' : 'Modo offline (polling)';
  }

  function iniciarPolling() {
    if (pollingTimer) return;
    pollingTimer = setInterval(buscarDashboardCompleto, INTERVALO_POLLING_MS);
  }

  function pararPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  function iniciar() {
    buscarDashboardCompleto();

    if (typeof io === 'undefined') {
      definirStatusConexao(false);
      iniciarPolling();
      return;
    }

    const socket = io({ reconnectionDelay: 1500 });

    socket.on('connect', () => {
      definirStatusConexao(true);
      pararPolling();
    });

    socket.on('disconnect', () => {
      definirStatusConexao(false);
      iniciarPolling();
    });

    socket.on('connect_error', () => {
      definirStatusConexao(false);
      iniciarPolling();
    });

    socket.on('dashboard:atualizar', (dados) => {
      aplicarSnapshot(dados);
      buscarUltimasVendas();
    });

    socket.on('venda:nova', (venda) => {
      mostrarToastVenda(venda);
    });
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
