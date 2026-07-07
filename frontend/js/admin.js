/**
 * js/admin.js
 * ----------------------------------------------------------------------
 * Lógica do painel administrativo (admin.html):
 *   - Login/logout com token em localStorage;
 *   - CRUD de vendas, coordenadores, equipes e empreendimentos;
 *   - Filtros e busca na lista de vendas;
 *   - Exportação CSV da lista filtrada.
 * ----------------------------------------------------------------------
 */

(function () {
  'use strict';

  const CHAVE_TOKEN = 'jrc_token';
  const CHAVE_USUARIO = 'jrc_usuario';

  const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Cache local de referências (recarregadas após cada mudança)
  let cache = { equipes: [], coordenadores: [], empreendimentos: [] };

  // ---------------------------------------------------------------------
  // Helpers de API
  // ---------------------------------------------------------------------
  function obterToken() {
    return localStorage.getItem(CHAVE_TOKEN);
  }

  async function apiFetch(url, opcoes = {}) {
    const token = obterToken();
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opcoes.headers || {});
    if (token) headers.Authorization = `Bearer ${token}`;

    const resposta = await fetch(url, Object.assign({}, opcoes, { headers }));

    if (resposta.status === 401) {
      encerrarSessao();
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(dados.erro || 'Erro inesperado na requisição.');
    }
    return dados;
  }

  // ---------------------------------------------------------------------
  // Autenticação
  // ---------------------------------------------------------------------
  function iniciarSessao(token, usuario) {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  }

  function encerrarSessao() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
    document.getElementById('appAdmin').hidden = true;
    document.getElementById('telaLogin').hidden = false;
  }

  function verificarSessao() {
    const token = obterToken();
    const usuarioBruto = localStorage.getItem(CHAVE_USUARIO);
    if (!token || !usuarioBruto) return false;
    const usuario = JSON.parse(usuarioBruto);
    document.getElementById('nomeUsuario').textContent = usuario.nome || usuario.login;
    document.getElementById('telaLogin').hidden = true;
    document.getElementById('appAdmin').hidden = false;
    return true;
  }

  document.getElementById('formLogin').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const erroEl = document.getElementById('loginErro');
    erroEl.textContent = '';

    const login = document.getElementById('loginUsuario').value.trim();
    const senha = document.getElementById('loginSenha').value;

    try {
      const resposta = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Falha ao entrar.');

      iniciarSessao(dados.token, dados.usuario);
      verificarSessao();
      carregarTudo();
    } catch (erro) {
      erroEl.textContent = erro.message;
    }
  });

  document.getElementById('btnLogout').addEventListener('click', async () => {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignora */ }
    encerrarSessao();
  });

  // ---------------------------------------------------------------------
  // Navegação entre abas
  // ---------------------------------------------------------------------
  document.getElementById('adminTabs').addEventListener('click', (ev) => {
    const botao = ev.target.closest('.admin-tab');
    if (!botao) return;

    document.querySelectorAll('.admin-tab').forEach((b) => b.classList.remove('admin-tab--ativo'));
    botao.classList.add('admin-tab--ativo');

    const alvo = botao.dataset.tab;
    ['vendas', 'coordenadores', 'equipes', 'empreendimentos'].forEach((nome) => {
      document.getElementById(`secao${capitalizar(nome)}`).hidden = nome !== alvo;
    });
  });

  function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function exibirMensagem(elId, texto, tipo) {
    const el = document.getElementById(elId);
    el.textContent = texto;
    el.className = `form__mensagem ${tipo}`;
    if (texto) setTimeout(() => { el.textContent = ''; el.className = 'form__mensagem'; }, 4000);
  }

  // ---------------------------------------------------------------------
  // Carregamento de dados de referência (equipes, coordenadores, empreendimentos)
  // ---------------------------------------------------------------------
  async function carregarReferencias() {
    const [equipes, coordenadores, empreendimentos] = await Promise.all([
      apiFetch('/api/equipes'),
      apiFetch('/api/coordenadores'),
      apiFetch('/api/empreendimentos'),
    ]);
    cache = { equipes, coordenadores, empreendimentos };
    preencherSelects();
    renderizarTabelaCoordenadores();
    renderizarTabelaEquipes();
    renderizarTabelaEmpreendimentos();
  }

  function preencherSelects() {
    const optEquipes = cache.equipes.map((e) => `<option value="${e.id}">${e.nome}</option>`).join('');
    const optCoordenadores = cache.coordenadores.map((c) => `<option value="${c.id}" data-equipe="${c.equipe_nome}">${c.nome}</option>`).join('');
    const optEmpreendimentos = cache.empreendimentos.map((e) => `<option value="${e.id}">${e.nome}</option>`).join('');

    document.getElementById('vendaCoordenador').innerHTML = optCoordenadores;
    document.getElementById('vendaEmpreendimento').innerHTML = optEmpreendimentos;
    document.getElementById('coordenadorEquipe').innerHTML = optEquipes;

    document.getElementById('filtroCoordenador').innerHTML =
      '<option value="">Todos os coordenadores</option>' + optCoordenadores;
    document.getElementById('filtroEquipe').innerHTML =
      '<option value="">Todas as equipes</option>' + optEquipes;
    document.getElementById('filtroEmpreendimento').innerHTML =
      '<option value="">Todos os empreendimentos</option>' + optEmpreendimentos;

    atualizarEquipeDisplay();
  }

  function atualizarEquipeDisplay() {
    const select = document.getElementById('vendaCoordenador');
    const opcaoSelecionada = select.options[select.selectedIndex];
    document.getElementById('vendaEquipeDisplay').value = opcaoSelecionada ? opcaoSelecionada.dataset.equipe : '';
  }

  document.getElementById('vendaCoordenador').addEventListener('change', atualizarEquipeDisplay);

  // ---------------------------------------------------------------------
  // VENDAS — listagem + filtros
  // ---------------------------------------------------------------------
  function obterFiltrosAtuais() {
    const params = new URLSearchParams();
    const busca = document.getElementById('filtroBusca').value.trim();
    const coordenadorId = document.getElementById('filtroCoordenador').value;
    const equipeId = document.getElementById('filtroEquipe').value;
    const empreendimentoId = document.getElementById('filtroEmpreendimento').value;
    const dataInicio = document.getElementById('filtroDataInicio').value;
    const dataFim = document.getElementById('filtroDataFim').value;

    if (busca) params.set('busca', busca);
    if (coordenadorId) params.set('coordenador_id', coordenadorId);
    if (equipeId) params.set('equipe_id', equipeId);
    if (empreendimentoId) params.set('empreendimento_id', empreendimentoId);
    if (dataInicio) params.set('data_inicio', dataInicio);
    if (dataFim) params.set('data_fim', dataFim);
    return params;
  }

  let vendasCarregadas = [];

  async function carregarVendas() {
    const params = obterFiltrosAtuais();
    vendasCarregadas = await apiFetch(`/api/vendas?${params.toString()}`);
    renderizarTabelaVendas(vendasCarregadas);
  }

  function renderizarTabelaVendas(lista) {
    const corpo = document.getElementById('tabelaVendasBody');
    const vazio = document.getElementById('vendasVazio');
    corpo.innerHTML = '';
    vazio.hidden = lista.length > 0;

    lista.forEach((v) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatarDataBr(v.data_venda)}</td>
        <td>${(v.hora_venda || '').slice(0, 5)}</td>
        <td>${v.coordenador_nome}</td>
        <td><span class="badge-equipe"><span class="badge-equipe__dot" style="background:${v.equipe_cor}"></span>${v.equipe_nome}</span></td>
        <td>${v.empreendimento_nome}</td>
        <td>${v.unidade}</td>
        <td>${formatadorMoeda.format(v.valor)}</td>
        <td>
          <div class="tabela-acoes">
            <button class="icone-botao" title="Editar" data-acao="editar" data-id="${v.id}">✏️</button>
            <button class="icone-botao icone-botao--perigo" title="Excluir" data-acao="excluir" data-id="${v.id}">🗑️</button>
          </div>
        </td>
      `;
      corpo.appendChild(tr);
    });
  }

  function formatarDataBr(dataIso) {
    if (!dataIso) return '—';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  document.getElementById('tabelaVendasBody').addEventListener('click', async (ev) => {
    const botao = ev.target.closest('button[data-acao]');
    if (!botao) return;
    const id = botao.dataset.id;

    if (botao.dataset.acao === 'editar') {
      const venda = vendasCarregadas.find((v) => String(v.id) === id);
      if (venda) preencherFormularioVenda(venda);
    }

    if (botao.dataset.acao === 'excluir') {
      if (!confirm('Tem certeza que deseja excluir esta venda?')) return;
      try {
        await apiFetch(`/api/vendas/${id}`, { method: 'DELETE' });
        await carregarVendas();
      } catch (erro) {
        alert(erro.message);
      }
    }
  });

  ['filtroBusca', 'filtroCoordenador', 'filtroEquipe', 'filtroEmpreendimento', 'filtroDataInicio', 'filtroDataFim']
    .forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener('input', debounce(carregarVendas, 300));
      el.addEventListener('change', carregarVendas);
    });

  document.getElementById('btnLimparFiltros').addEventListener('click', () => {
    ['filtroBusca', 'filtroCoordenador', 'filtroEquipe', 'filtroEmpreendimento', 'filtroDataInicio', 'filtroDataFim']
      .forEach((id) => { document.getElementById(id).value = ''; });
    carregarVendas();
  });

  function debounce(fn, atraso) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), atraso);
    };
  }

  // ---------------------------------------------------------------------
  // VENDAS — formulário de cadastro/edição
  // ---------------------------------------------------------------------
  function preencherFormularioVenda(venda) {
    document.getElementById('vendaId').value = venda.id;
    document.getElementById('vendaCoordenador').value = venda.coordenador_id;
    document.getElementById('vendaEmpreendimento').value = venda.empreendimento_id;
    document.getElementById('vendaUnidade').value = venda.unidade;
    document.getElementById('vendaValor').value = venda.valor;
    document.getElementById('vendaData').value = venda.data_venda;
    atualizarEquipeDisplay();

    document.getElementById('btnSalvarVenda').textContent = 'Salvar Alterações';
    document.getElementById('btnCancelarEdicaoVenda').hidden = false;
    document.querySelector('#secaoVendas').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function limparFormularioVenda() {
    document.getElementById('formVenda').reset();
    document.getElementById('vendaId').value = '';
    document.getElementById('vendaData').value = new Date().toISOString().slice(0, 10);
    document.getElementById('btnSalvarVenda').textContent = 'Cadastrar Venda';
    document.getElementById('btnCancelarEdicaoVenda').hidden = true;
    atualizarEquipeDisplay();
  }

  document.getElementById('btnCancelarEdicaoVenda').addEventListener('click', limparFormularioVenda);

  document.getElementById('formVenda').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('vendaId').value;
    const payload = {
      coordenador_id: Number(document.getElementById('vendaCoordenador').value),
      empreendimento_id: Number(document.getElementById('vendaEmpreendimento').value),
      unidade: document.getElementById('vendaUnidade').value.trim(),
      valor: Number(document.getElementById('vendaValor').value),
      data_venda: document.getElementById('vendaData').value,
    };

    try {
      if (id) {
        await apiFetch(`/api/vendas/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        exibirMensagem('vendaMensagem', 'Venda atualizada com sucesso!', 'sucesso');
      } else {
        await apiFetch('/api/vendas', { method: 'POST', body: JSON.stringify(payload) });
        exibirMensagem('vendaMensagem', 'Venda cadastrada com sucesso! O ranking já foi atualizado.', 'sucesso');
      }
      limparFormularioVenda();
      await carregarVendas();
    } catch (erro) {
      exibirMensagem('vendaMensagem', erro.message, 'erro');
    }
  });

  // ---------------------------------------------------------------------
  // VENDAS — exportação CSV
  // ---------------------------------------------------------------------
  document.getElementById('btnExportarCsv').addEventListener('click', () => {
    if (!vendasCarregadas.length) {
      alert('Não há vendas para exportar com os filtros atuais.');
      return;
    }
    const cabecalho = ['Data', 'Hora', 'Coordenador', 'Equipe', 'Empreendimento', 'Unidade', 'Valor'];
    const linhas = vendasCarregadas.map((v) => [
      formatarDataBr(v.data_venda),
      (v.hora_venda || '').slice(0, 5),
      v.coordenador_nome,
      v.equipe_nome,
      v.empreendimento_nome,
      v.unidade,
      String(v.valor).replace('.', ','),
    ]);

    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendas_jrc_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });

  // ---------------------------------------------------------------------
  // COORDENADORES — CRUD
  // ---------------------------------------------------------------------
  function renderizarTabelaCoordenadores() {
    const corpo = document.getElementById('tabelaCoordenadoresBody');
    corpo.innerHTML = cache.coordenadores.map((c) => `
      <tr>
        <td>${c.nome}</td>
        <td><span class="badge-equipe"><span class="badge-equipe__dot" style="background:${c.equipe_cor}"></span>${c.equipe_nome}</span></td>
        <td>
          <div class="tabela-acoes">
            <button class="icone-botao" data-acao="editar" data-id="${c.id}" title="Editar">✏️</button>
            <button class="icone-botao icone-botao--perigo" data-acao="excluir" data-id="${c.id}" title="Excluir">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('tabelaCoordenadoresBody').addEventListener('click', async (ev) => {
    const botao = ev.target.closest('button[data-acao]');
    if (!botao) return;
    const id = botao.dataset.id;

    if (botao.dataset.acao === 'editar') {
      const item = cache.coordenadores.find((c) => String(c.id) === id);
      if (!item) return;
      document.getElementById('coordenadorId').value = item.id;
      document.getElementById('coordenadorNome').value = item.nome;
      document.getElementById('coordenadorEquipe').value = item.equipe_id;
      document.getElementById('coordenadorFoto').value = item.foto || '';
      document.getElementById('btnCancelarEdicaoCoordenador').hidden = false;
    }

    if (botao.dataset.acao === 'excluir') {
      if (!confirm('Excluir este coordenador? (as vendas já cadastradas serão mantidas)')) return;
      await apiFetch(`/api/coordenadores/${id}`, { method: 'DELETE' });
      await carregarReferencias();
    }
  });

  document.getElementById('btnCancelarEdicaoCoordenador').addEventListener('click', () => {
    document.getElementById('formCoordenador').reset();
    document.getElementById('coordenadorId').value = '';
    document.getElementById('btnCancelarEdicaoCoordenador').hidden = true;
  });

  document.getElementById('formCoordenador').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('coordenadorId').value;
    const payload = {
      nome: document.getElementById('coordenadorNome').value.trim(),
      equipe_id: Number(document.getElementById('coordenadorEquipe').value),
      foto: document.getElementById('coordenadorFoto').value.trim() || null,
    };
    try {
      if (id) {
        await apiFetch(`/api/coordenadores/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/coordenadores', { method: 'POST', body: JSON.stringify(payload) });
      }
      exibirMensagem('coordenadorMensagem', 'Coordenador salvo com sucesso!', 'sucesso');
      document.getElementById('formCoordenador').reset();
      document.getElementById('coordenadorId').value = '';
      document.getElementById('btnCancelarEdicaoCoordenador').hidden = true;
      await carregarReferencias();
    } catch (erro) {
      exibirMensagem('coordenadorMensagem', erro.message, 'erro');
    }
  });

  // ---------------------------------------------------------------------
  // EQUIPES — CRUD
  // ---------------------------------------------------------------------
  function renderizarTabelaEquipes() {
    const corpo = document.getElementById('tabelaEquipesBody');
    corpo.innerHTML = cache.equipes.map((e) => `
      <tr>
        <td>${e.nome}</td>
        <td><span class="badge-equipe__dot" style="background:${e.cor};display:inline-block;width:14px;height:14px;border-radius:4px;"></span></td>
        <td>
          <div class="tabela-acoes">
            <button class="icone-botao" data-acao="editar" data-id="${e.id}" title="Editar">✏️</button>
            <button class="icone-botao icone-botao--perigo" data-acao="excluir" data-id="${e.id}" title="Excluir">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('tabelaEquipesBody').addEventListener('click', async (ev) => {
    const botao = ev.target.closest('button[data-acao]');
    if (!botao) return;
    const id = botao.dataset.id;

    if (botao.dataset.acao === 'editar') {
      const item = cache.equipes.find((e) => String(e.id) === id);
      if (!item) return;
      document.getElementById('equipeId').value = item.id;
      document.getElementById('equipeNome').value = item.nome;
      document.getElementById('equipeCor').value = item.cor;
      document.getElementById('btnCancelarEdicaoEquipe').hidden = false;
    }

    if (botao.dataset.acao === 'excluir') {
      if (!confirm('Excluir esta equipe?')) return;
      await apiFetch(`/api/equipes/${id}`, { method: 'DELETE' });
      await carregarReferencias();
    }
  });

  document.getElementById('btnCancelarEdicaoEquipe').addEventListener('click', () => {
    document.getElementById('formEquipe').reset();
    document.getElementById('equipeId').value = '';
    document.getElementById('btnCancelarEdicaoEquipe').hidden = true;
  });

  document.getElementById('formEquipe').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('equipeId').value;
    const payload = {
      nome: document.getElementById('equipeNome').value.trim(),
      cor: document.getElementById('equipeCor').value,
    };
    try {
      if (id) {
        await apiFetch(`/api/equipes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/equipes', { method: 'POST', body: JSON.stringify(payload) });
      }
      exibirMensagem('equipeMensagem', 'Equipe salva com sucesso!', 'sucesso');
      document.getElementById('formEquipe').reset();
      document.getElementById('equipeId').value = '';
      document.getElementById('btnCancelarEdicaoEquipe').hidden = true;
      await carregarReferencias();
    } catch (erro) {
      exibirMensagem('equipeMensagem', erro.message, 'erro');
    }
  });

  // ---------------------------------------------------------------------
  // EMPREENDIMENTOS — CRUD
  // ---------------------------------------------------------------------
  function renderizarTabelaEmpreendimentos() {
    const corpo = document.getElementById('tabelaEmpreendimentosBody');
    corpo.innerHTML = cache.empreendimentos.map((e) => `
      <tr>
        <td>${e.nome}</td>
        <td>${e.meta_vendas || 0}</td>
        <td>
          <div class="tabela-acoes">
            <button class="icone-botao" data-acao="editar" data-id="${e.id}" title="Editar">✏️</button>
            <button class="icone-botao icone-botao--perigo" data-acao="excluir" data-id="${e.id}" title="Excluir">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('tabelaEmpreendimentosBody').addEventListener('click', async (ev) => {
    const botao = ev.target.closest('button[data-acao]');
    if (!botao) return;
    const id = botao.dataset.id;

    if (botao.dataset.acao === 'editar') {
      const item = cache.empreendimentos.find((e) => String(e.id) === id);
      if (!item) return;
      document.getElementById('empreendimentoId').value = item.id;
      document.getElementById('empreendimentoNome').value = item.nome;
      document.getElementById('empreendimentoMeta').value = item.meta_vendas || 0;
      document.getElementById('empreendimentoImagem').value = item.imagem || '';
      document.getElementById('btnCancelarEdicaoEmpreendimento').hidden = false;
    }

    if (botao.dataset.acao === 'excluir') {
      if (!confirm('Excluir este empreendimento?')) return;
      await apiFetch(`/api/empreendimentos/${id}`, { method: 'DELETE' });
      await carregarReferencias();
    }
  });

  document.getElementById('btnCancelarEdicaoEmpreendimento').addEventListener('click', () => {
    document.getElementById('formEmpreendimento').reset();
    document.getElementById('empreendimentoId').value = '';
    document.getElementById('btnCancelarEdicaoEmpreendimento').hidden = true;
  });

  document.getElementById('formEmpreendimento').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('empreendimentoId').value;
    const payload = {
      nome: document.getElementById('empreendimentoNome').value.trim(),
      meta_vendas: Number(document.getElementById('empreendimentoMeta').value) || 0,
      imagem: document.getElementById('empreendimentoImagem').value.trim() || null,
    };
    try {
      if (id) {
        await apiFetch(`/api/empreendimentos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/empreendimentos', { method: 'POST', body: JSON.stringify(payload) });
      }
      exibirMensagem('empreendimentoMensagem', 'Empreendimento salvo com sucesso!', 'sucesso');
      document.getElementById('formEmpreendimento').reset();
      document.getElementById('empreendimentoId').value = '';
      document.getElementById('btnCancelarEdicaoEmpreendimento').hidden = true;
      await carregarReferencias();
    } catch (erro) {
      exibirMensagem('empreendimentoMensagem', erro.message, 'erro');
    }
  });

  // ---------------------------------------------------------------------
  // Tempo real: mantém a lista de vendas sincronizada quando outra
  // pessoa cadastra/edita/exclui uma venda em paralelo.
  // ---------------------------------------------------------------------
  function conectarSocket() {
    if (typeof io === 'undefined') return;
    const socket = io();
    socket.on('dashboard:atualizar', () => {
      if (!document.getElementById('secaoVendas').hidden) {
        carregarVendas();
      }
    });
  }

  // ---------------------------------------------------------------------
  // Inicialização
  // ---------------------------------------------------------------------
  async function carregarTudo() {
    limparFormularioVenda();
    await carregarReferencias();
    await carregarVendas();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (verificarSessao()) {
      carregarTudo();
      conectarSocket();
    }
  });
})();
