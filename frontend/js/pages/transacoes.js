// Transações: lista (grupos por dia no mobile, tabela no desktop), filtros, busca e CRUD.
// Depende de: js/api.js, js/util.js, js/modal.js, js/icons.js.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var desktop = window.matchMedia('(min-width: 1024px)');

  var todas = [];       // transações normalizadas
  var categorias = [];  // do backend
  var editando = null;  // transação em edição (ou null = nova)

  // ---------- Ícones estáticos ----------
  document.querySelectorAll('.ph-add').forEach(function (b) { b.innerHTML = ICONS['plus-sm']; });
  document.querySelector('.txp-search-ic').innerHTML = ICONS['search-m'];
  document.querySelector('#modal-tx .modal-close').innerHTML = ICONS.close;

  // ---------- Filtros (select nativo com texto de chip) ----------
  function labelOpcao(opt) {
    if (!opt) return '';
    return (desktop.matches ? opt.getAttribute('data-d') : opt.getAttribute('data-m')) || opt.textContent;
  }

  function syncFiltros() {
    document.querySelectorAll('.txp-filters .filter').forEach(function (f) {
      var sel = f.querySelector('select');
      f.querySelector('.filter-text').textContent = labelOpcao(sel.options[sel.selectedIndex]);
    });
  }

  function preencherFiltros() {
    var fCat = $('f-categoria');
    var nomes = {};
    categorias.forEach(function (c) { nomes[c.nome] = true; });
    Object.keys(nomes).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }).forEach(function (n) {
      var o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      fCat.appendChild(o);
    });
    var fConta = $('f-conta');
    U.CONTAS.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      fConta.appendChild(o);
    });
    syncFiltros();
  }

  ['f-periodo', 'f-categoria', 'f-conta'].forEach(function (id) {
    $(id).addEventListener('change', function () { syncFiltros(); render(); });
  });
  $('tx-busca').addEventListener('input', render);
  if (desktop.addEventListener) desktop.addEventListener('change', syncFiltros);
  else if (desktop.addListener) desktop.addListener(syncFiltros);

  function noPeriodo(d, periodo, hoje) {
    if (periodo === 'tudo') return true;
    if (periodo === 'mes') return U.mesmoMes(d, hoje);
    if (periodo === 'passado') return U.mesmoMes(d, new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
    if (periodo === '3m') return d >= new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
    return true;
  }

  function normalizar(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function filtradas() {
    var hoje = new Date();
    var periodo = $('f-periodo').value;
    var cat = $('f-categoria').value;
    var conta = $('f-conta').value;
    var q = normalizar($('tx-busca').value.trim());
    return todas.filter(function (t) {
      if (!noPeriodo(t.data, periodo, hoje)) return false;
      if (cat && t.categoria !== cat) return false;
      if (conta && t.conta !== conta) return false;
      if (q && normalizar(t.nome + ' ' + t.categoria + ' ' + t.conta).indexOf(q) === -1) return false;
      return true;
    });
  }

  // ---------- Render ----------
  function valorTxt(t) { return U.moedaSinal(t.valor, t.tipo === 'receita'); }

  function rotuloDia(d, hoje) {
    var ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
    if (U.mesmoDia(d, hoje)) return 'Hoje · ' + U.diaMes(d);
    if (U.mesmoDia(d, ontem)) return 'Ontem · ' + U.diaMes(d);
    return U.diaMes(d);
  }

  function render() {
    var lista = filtradas();
    renderMobile(lista);
    renderDesktop(lista);
  }

  function vazio() {
    var temFiltro = $('tx-busca').value.trim() || $('f-categoria').value || $('f-conta').value;
    return '<p class="empty-state">' + (temFiltro ? 'Nenhuma transação encontrada' : 'Nenhuma transação neste período') + '</p>';
  }

  function renderMobile(lista) {
    var el = $('tx-groups');
    if (!lista.length) { el.innerHTML = vazio(); return; }
    var hoje = new Date();
    var grupos = [];
    lista.forEach(function (t) {
      var g = grupos[grupos.length - 1];
      if (!g || !U.mesmoDia(g.dia, t.data)) grupos.push(g = { dia: t.data, itens: [] });
      g.itens.push(t);
    });
    el.innerHTML = grupos.map(function (g) {
      return '<div class="txp-day"><p class="txp-day-label">' + U.esc(rotuloDia(g.dia, hoje)) + '</p>' +
        '<div class="txp-card">' + g.itens.map(function (t, i) {
          var rec = t.tipo === 'receita';
          return (i ? '<div class="txp-divider"></div>' : '') +
            '<button type="button" class="txp-row" data-id="' + t.id + '" aria-label="Editar ' + U.esc(t.nome) + '">' +
              '<span class="txp-info"><span class="txp-name">' + U.esc(t.nome) + '</span>' +
              '<span class="txp-cat">' + U.esc(t.categoria) + '</span></span>' +
              '<span class="txp-value' + (rec ? ' is-income' : '') + '">' + U.esc(valorTxt(t)) + '</span>' +
            '</button>';
        }).join('') + '</div></div>';
    }).join('');
  }

  function renderDesktop(lista) {
    var el = $('tx-rows');
    if (!lista.length) { el.innerHTML = vazio(); return; }
    el.innerHTML = lista.map(function (t) {
      var rec = t.tipo === 'receita';
      return '<button type="button" class="txp-tr" role="row" data-id="' + t.id + '" aria-label="Editar ' + U.esc(t.nome) + '">' +
        '<span class="txp-td-desc">' + U.esc(t.nome) + '</span>' +
        '<span class="txp-td-muted">' + U.esc(t.categoria) + '</span>' +
        '<span class="txp-td-muted">' + U.esc(t.conta) + '</span>' +
        '<span class="txp-td-muted">' + U.esc(U.diaMes(t.data)) + '</span>' +
        '<span class="txp-td-valor' + (rec ? ' is-income' : '') + '">' + U.esc(valorTxt(t)) + '</span>' +
      '</button>';
    }).join('');
  }

  function renderLoading() {
    var s = function (w, h) { return '<span class="skel" style="width:' + w + 'px;height:' + h + 'px"></span>'; };
    var linhaM = '<div class="txp-row"><span class="txp-info">' + s(130, 13) + s(80, 11) + '</span>' + s(70, 13) + '</div>';
    $('tx-groups').innerHTML = '<div class="txp-day">' + s(90, 13) + '<div class="txp-card">' +
      linhaM + '<div class="txp-divider"></div>' + linhaM + '<div class="txp-divider"></div>' + linhaM + '</div></div>';
    var linhaD = '<div class="txp-tr">' + s(160, 13) + s(90, 13) + s(110, 13) + s(50, 13) + s(80, 13) + '</div>';
    $('tx-rows').innerHTML = linhaD + linhaD + linhaD + linhaD;
  }

  function onRowClick(e) {
    var row = e.target.closest('[data-id]');
    if (!row) return;
    var id = Number(row.getAttribute('data-id'));
    var t = todas.filter(function (x) { return x.id === id; })[0];
    if (t) abrirModal(t);
  }
  $('tx-groups').addEventListener('click', onRowClick);
  $('tx-rows').addEventListener('click', onRowClick);

  // ---------- Dados ----------
  function normalizarTx(t) {
    var cat = t.categoria || {};
    return {
      id: t.id_transacao,
      nome: t.descricao || cat.nome || 'Transação',
      categoria: cat.nome || 'Sem categoria',
      categoria_id: t.categoria_id,
      tipo: t.tipo,
      valor: U.num(t.valor),
      data: new Date(t.data),
      conta: U.contaDe(t.id_transacao)
    };
  }

  async function carregarLista() {
    var r = await Transacoes.listar();
    todas = (r || []).map(normalizarTx).sort(function (a, b) { return b.data - a.data; });
  }

  async function carregar(primeira) {
    $('tx-alert').hidden = true;
    renderLoading();
    try {
      var r = await Promise.all([Transacoes.listar(), primeira ? Categorias.listar() : Promise.resolve(categorias)]);
      categorias = r[1] || [];
      todas = (r[0] || []).map(normalizarTx).sort(function (a, b) { return b.data - a.data; });
      if (primeira) preencherFiltros();
      render();
      return true;
    } catch (err) {
      console.error(err);
      $('tx-alert').hidden = false;
      $('tx-groups').innerHTML = '';
      $('tx-rows').innerHTML = '';
      return false;
    }
  }

  var carregou = false;
  $('tx-retry').addEventListener('click', async function () {
    carregou = await carregar(!carregou) || carregou;
  });

  // ---------- Modal ----------
  var modal = $('modal-tx');
  var form = $('form-tx');
  var toggle = $('tx-tipo');
  var inDesc = $('tx-descricao'), inValor = $('tx-valor'), inData = $('tx-data');
  var inCat = $('tx-categoria'), inConta = $('tx-conta');
  var erroEl = $('tx-erro');
  var btnSalvar = $('tx-salvar'), btnExcluir = $('tx-excluir'), btnCancelar = $('tx-cancelar');
  var confirmandoExclusao = false;

  U.mascaraMoeda(inValor);

  U.CONTAS.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    inConta.appendChild(o);
  });

  function setTipo(tipo) {
    toggle.setAttribute('data-value', tipo);
    toggle.querySelectorAll('[data-tipo]').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-tipo') === tipo));
    });
    preencherCategorias(tipo);
  }

  function preencherCategorias(tipo) {
    var atual = inCat.value;
    inCat.innerHTML = '<option value="">Selecionar categoria</option>';
    categorias.filter(function (c) { return c.tipo === tipo; }).forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.nome;
      inCat.appendChild(o);
    });
    inCat.value = atual;
    if (inCat.value !== atual) inCat.value = '';
    syncVazio();
  }

  function syncVazio() {
    [inCat, inConta].forEach(function (s) { s.classList.toggle('is-empty', !s.value); });
  }
  inCat.addEventListener('change', syncVazio);
  inConta.addEventListener('change', syncVazio);

  toggle.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tipo]');
    if (b) setTipo(b.getAttribute('data-tipo'));
  });
  toggle.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      var novo = toggle.getAttribute('data-value') === 'despesa' ? 'receita' : 'despesa';
      setTipo(novo);
      toggle.querySelector('[data-tipo="' + novo + '"]').focus();
    }
  });

  function mostrarErro(msg) {
    erroEl.textContent = msg;
    erroEl.hidden = !msg;
  }

  function resetExclusao() {
    confirmandoExclusao = false;
    btnExcluir.textContent = 'Excluir';
  }

  function abrirModal(t) {
    editando = t || null;
    form.reset();
    mostrarErro('');
    resetExclusao();
    [inDesc, inValor, inData].forEach(function (i) { i.classList.remove('is-error'); });

    $('modal-tx-title').textContent = t ? 'Editar transação' : 'Nova transação';
    btnExcluir.hidden = !t;
    btnCancelar.hidden = !!t;

    setTipo(t ? t.tipo : 'despesa');
    inDesc.value = t ? t.nome : '';
    inValor.value = t ? U.moeda(t.valor) : '';
    inData.value = U.isoDia(t ? t.data : new Date());
    inCat.value = t && t.categoria_id ? String(t.categoria_id) : '';
    inConta.value = t ? t.conta : '';
    syncVazio();

    // Desktop: foco direto na descrição. Mobile: não abre o teclado sozinho.
    inDesc.toggleAttribute('autofocus', desktop.matches);
    Modal.open(modal);
  }

  document.querySelectorAll('[data-nova]').forEach(function (b) {
    b.addEventListener('click', function () { abrirModal(null); });
  });

  function validar() {
    var ok = true;
    var valor = U.parseValor(inValor.value);
    inDesc.classList.toggle('is-error', !inDesc.value.trim());
    inValor.classList.toggle('is-error', !(valor > 0));
    inData.classList.toggle('is-error', !inData.value);
    if (!inDesc.value.trim()) { mostrarErro('Informe uma descrição.'); ok = false; }
    else if (!(valor > 0)) { mostrarErro('Informe um valor maior que zero.'); ok = false; }
    else if (!inData.value) { mostrarErro('Informe a data.'); ok = false; }
    return ok ? valor : null;
  }

  function ocupado(sim) {
    btnSalvar.disabled = sim;
    btnExcluir.disabled = sim;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    mostrarErro('');
    var valor = validar();
    if (valor == null) return;

    // Data local ao meio-dia: o dia não muda por fuso.
    var hora = editando ? editando.data : new Date();
    var d = U.dataLocal(inData.value);
    d.setHours(hora.getHours(), hora.getMinutes(), 0, 0);

    var dados = {
      tipo: toggle.getAttribute('data-value'),
      descricao: inDesc.value.trim(),
      valor: valor,
      data: d.toISOString(),
      categoria_id: inCat.value ? Number(inCat.value) : null
    };

    ocupado(true);
    btnSalvar.textContent = 'Salvando...';
    try {
      var salvo = editando
        ? await Transacoes.atualizar(editando.id, dados)
        : await Transacoes.criar(dados);
      var id = editando ? editando.id : salvo.id_transacao;
      U.setConta(id, inConta.value || U.CONTAS[0]);
      var eraEdicao = !!editando;
      Modal.close(modal, true);
      await carregarLista().catch(function () {});
      render();
      showSuccess('Transação salva!',
        eraEdicao ? 'Sua transação foi atualizada com sucesso.' : 'Sua transação foi registrada com sucesso.');
    } catch (err) {
      mostrarErro(U.erroMsg(err));
    } finally {
      ocupado(false);
      btnSalvar.textContent = 'Salvar transação';
    }
  });

  // Excluir pede confirmação no próprio botão (sem confirm(), bloqueado em alguns navegadores).
  btnExcluir.addEventListener('click', async function () {
    if (!editando) return;
    if (!confirmandoExclusao) {
      confirmandoExclusao = true;
      btnExcluir.textContent = 'Confirmar exclusão';
      return;
    }
    ocupado(true);
    try {
      await Transacoes.deletar(editando.id);
      U.setConta(editando.id, null);
      Modal.close(modal, true);
      await carregarLista().catch(function () {});
      render();
      if (typeof showToast === 'function') showToast('Transação excluída');
    } catch (err) {
      mostrarErro(U.erroMsg(err));
    } finally {
      ocupado(false);
      resetExclusao();
    }
  });

  // ---------- Início ----------
  carregar(true).then(function (ok) {
    carregou = ok;
    if (ok && new URLSearchParams(location.search).get('nova') === '1') abrirModal(null);
  });
})();
