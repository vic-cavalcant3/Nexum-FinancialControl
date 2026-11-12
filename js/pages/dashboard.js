// Dashboard (Visão geral). Depende de js/api.js.
(function () {
  var root = document.getElementById('dash');
  var alertBox = document.getElementById('dash-alert');

  // ---------- Formatação ----------
  var brlInt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  var brlCents = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var pct1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var pct0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  var mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
  var hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Intl usa espaço não-quebrável entre "R$" e o número (mantido de propósito: não quebra linha).
  function moedaInt(v) { return brlInt.format(v); }
  function moedaCents(v) { return brlCents.format(Math.abs(v)); }
  function mesAbrev(d) { return mesCurto.format(d).replace('.', ''); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  // ---------- Helpers de UI ----------
  function slots(name) { return root.querySelectorAll('[data-slot="' + name + '"]'); }

  function setSlot(name, html) {
    slots(name).forEach(function (el) { el.innerHTML = html; });
  }

  function skel(w, h) {
    return '<span class="skel" style="width:' + w + 'px;height:' + h + 'px"></span>';
  }

  // Variação % entre atual e anterior; null se anterior for 0.
  function variacao(atual, anterior) {
    if (!anterior) return null;
    return ((atual - anterior) / Math.abs(anterior)) * 100;
  }

  function deltaText(v) {
    return (v >= 0 ? '↑ ' : '↓ ') + pct1.format(Math.abs(v)) + '% vs mês anterior';
  }

  function setDelta(name, v, colorize) {
    slots(name).forEach(function (el) {
      el.classList.remove('up', 'down');
      if (v === null) { el.textContent = ''; el.hidden = true; return; }
      el.hidden = false;
      el.textContent = deltaText(v);
      if (colorize) el.classList.add(v >= 0 ? 'up' : 'down');
    });
  }

  // ---------- Estados ----------
  function renderLoading() {
    root.classList.remove('is-error');
    alertBox.hidden = true;

    setSlot('saldo', skel(140, 32));
    setSlot('receitas', skel(90, 20));
    setSlot('despesas', skel(90, 20));
    setSlot('economias', skel(110, 26));
    ['saldo-delta-m', 'saldo-delta', 'receitas-delta', 'despesas-delta', 'economias-delta'].forEach(function (n) {
      slots(n).forEach(function (el) { el.hidden = false; el.innerHTML = skel(130, 12); });
    });

    var alturas = [0.5, 0.75, 0.4, 0.9, 0.6, 0.8];
    document.getElementById('flow').innerHTML = alturas.map(function (a) {
      return '<div class="flow-col"><span class="flow-bar skel" style="height:calc(var(--bar-max) * ' + a + ')"></span>' +
        '<span class="flow-month">' + skel(18, 10) + '</span></div>';
    }).join('');

    var linhas = [];
    for (var i = 0; i < 4; i++) {
      if (i) linhas.push('<div class="tx-divider"></div>');
      linhas.push('<div class="tx-row"><div class="tx-info">' + skel(120, 13) + skel(80, 11) + '</div>' + skel(64, 13) + '</div>');
    }
    document.getElementById('transacoes').innerHTML = linhas.join('');

    function barrasSkel(n) {
      var html = '';
      for (var j = 0; j < n; j++) {
        html += '<div class="bar-row"><div class="bar-row-head">' + skel(90, 12) + skel(50, 12) + '</div><div class="track"></div></div>';
      }
      return html;
    }
    document.getElementById('categorias').innerHTML = barrasSkel(5);
    document.getElementById('metas').innerHTML = barrasSkel(3);
  }

  function renderError() {
    root.classList.add('is-error');
    alertBox.hidden = false;
  }

  // ---------- Dados ----------
  function mesAno(d) { return { mes: d.getMonth() + 1, ano: d.getFullYear() }; }

  function mesmoMes(d, ref) {
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  }

  async function carregar() {
    renderLoading();

    var hoje = new Date();
    var atual = mesAno(hoje);
    var anteriorData = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    var anterior = mesAno(anteriorData);

    try {
      var r = await Promise.all([
        Transacoes.listar(),
        Transacoes.resumo(atual.mes, atual.ano),
        Transacoes.resumo(anterior.mes, anterior.ano),
        Metas.listar()
      ]);
      render(r[0] || [], r[1] || {}, r[2] || {}, r[3] || [], hoje);
    } catch (err) {
      console.error(err);
      renderError();
    }
  }

  function render(transacoes, resumoAtual, resumoAnterior, metas, hoje) {
    var txs = transacoes.map(function (t) {
      return {
        nome: t.descricao || (t.categoria && t.categoria.nome) || 'Transação',
        categoria: (t.categoria && t.categoria.nome) || 'Sem categoria',
        tipo: t.tipo,
        valor: num(t.valor),
        data: new Date(t.data)
      };
    });

    function sinal(t) { return t.tipo === 'receita' ? t.valor : -t.valor; }

    // Saldo total acumulado e saldo acumulado até o fim do mês anterior
    var inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    var saldoTotal = 0, saldoAteMesAnterior = 0;
    txs.forEach(function (t) {
      saldoTotal += sinal(t);
      if (t.data < inicioMes) saldoAteMesAnterior += sinal(t);
    });

    var rec = num(resumoAtual.receitas), desp = num(resumoAtual.despesas);
    var recAnt = num(resumoAnterior.receitas), despAnt = num(resumoAnterior.despesas);
    var eco = rec - desp, ecoAnt = recAnt - despAnt;

    setSlot('saldo', esc(moedaInt(saldoTotal)));
    setSlot('receitas', esc(moedaInt(rec)));
    setSlot('despesas', esc(moedaInt(desp)));
    setSlot('economias', esc(moedaInt(eco)));

    var vSaldo = variacao(saldoTotal, saldoAteMesAnterior);
    setDelta('saldo-delta-m', vSaldo, false);
    setDelta('saldo-delta', vSaldo, true);
    setDelta('receitas-delta', variacao(rec, recAnt), true);
    setDelta('despesas-delta', variacao(desp, despAnt), true);
    setDelta('economias-delta', variacao(eco, ecoAnt), true);

    renderFluxo(txs, hoje, sinal);
    renderTransacoes(txs);
    renderCategorias(txs, hoje);
    renderMetas(metas);
  }

  function renderFluxo(txs, hoje, sinal) {
    var meses = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({ ref: d, liquido: 0 });
    }
    txs.forEach(function (t) {
      meses.forEach(function (m) { if (mesmoMes(t.data, m.ref)) m.liquido += sinal(t); });
    });

    var max = Math.max.apply(null, meses.map(function (m) { return m.liquido; }));
    var flow = document.getElementById('flow');

    flow.innerHTML = meses.map(function (m, i) {
      var frac = max > 0 && m.liquido > 0 ? m.liquido / max : 0;
      var valor = (m.liquido < 0 ? '-' : '') + moedaCents(m.liquido);
      return '<div class="flow-col">' +
        '<button type="button" class="flow-bar" data-i="' + i + '" style="height:max(4px, calc(var(--bar-max) * ' + frac.toFixed(4) + '))"' +
        ' aria-label="' + esc(mesAbrev(m.ref) + ': ' + valor) + '" data-valor="' + esc(valor) + '"></button>' +
        '<span class="flow-month">' + esc(mesAbrev(m.ref)) + '</span></div>';
    }).join('');
  }

  // Tocar na barra mostra o valor (um por vez).
  document.getElementById('flow').addEventListener('click', function (e) {
    var bar = e.target.closest('button.flow-bar');
    var flow = e.currentTarget;
    var aberto = flow.querySelector('.flow-tip');
    var mesmo = aberto && aberto.parentNode === (bar && bar.parentNode);
    if (aberto) aberto.remove();
    if (!bar || mesmo) return;
    var tip = document.createElement('span');
    tip.className = 'flow-tip';
    tip.textContent = bar.getAttribute('data-valor');
    bar.parentNode.appendChild(tip);
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#flow')) {
      var t = document.querySelector('#flow .flow-tip');
      if (t) t.remove();
    }
  });

  function renderTransacoes(txs) {
    var el = document.getElementById('transacoes');
    var recentes = txs.slice().sort(function (a, b) { return b.data - a.data; }).slice(0, 4);
    if (!recentes.length) {
      el.innerHTML = '<p class="dash-empty">Nenhuma transação ainda</p>';
      return;
    }
    el.innerHTML = recentes.map(function (t, i) {
      var receita = t.tipo === 'receita';
      var valor = (receita ? '+' : '-') + moedaCents(t.valor);
      var metaD = t.data.getDate() + ' ' + mesAbrev(t.data) + ' · ' + hora.format(t.data) + ' · ' + t.categoria;
      return (i ? '<div class="tx-divider"></div>' : '') +
        '<div class="tx-row"><div class="tx-info">' +
          '<span class="tx-name">' + esc(t.nome) + '</span>' +
          '<span class="tx-meta tx-meta-m">' + esc(t.categoria) + '</span>' +
          '<span class="tx-meta tx-meta-d">' + esc(metaD) + '</span>' +
        '</div><span class="tx-value' + (receita ? ' is-income' : '') + '">' + esc(valor) + '</span></div>';
    }).join('');
  }

  function barRow(nome, valorTxt, frac, pctClass) {
    return '<div class="bar-row"><div class="bar-row-head">' +
      '<span class="bar-row-name">' + esc(nome) + '</span>' +
      '<span class="bar-row-value' + (pctClass ? ' is-pct' : '') + '">' + esc(valorTxt) + '</span></div>' +
      '<div class="track"><div class="track-fill" style="width:' + (Math.max(0, Math.min(1, frac)) * 100).toFixed(2) + '%"></div></div></div>';
  }

  function renderCategorias(txs, hoje) {
    var el = document.getElementById('categorias');
    var grupos = {};
    var total = 0;
    txs.forEach(function (t) {
      if (t.tipo !== 'despesa' || !mesmoMes(t.data, hoje)) return;
      grupos[t.categoria] = (grupos[t.categoria] || 0) + t.valor;
      total += t.valor;
    });
    var lista = Object.keys(grupos).map(function (k) { return { nome: k, valor: grupos[k] }; })
      .sort(function (a, b) { return b.valor - a.valor; });

    if (!lista.length) {
      el.innerHTML = '<p class="dash-empty">Nenhuma despesa este mês</p>';
      return;
    }

    var top = lista.slice(0, 4);
    var resto = lista.slice(4).reduce(function (s, c) { return s + c.valor; }, 0);
    if (resto > 0) top.push({ nome: 'Outros', valor: resto });

    el.innerHTML = top.map(function (c) {
      return barRow(c.nome, moedaInt(c.valor), total ? c.valor / total : 0, false);
    }).join('');
  }

  function renderMetas(metas) {
    var el = document.getElementById('metas');
    if (!metas.length) {
      el.innerHTML = '<p class="dash-empty">Nenhuma meta ainda</p>';
      return;
    }
    el.innerHTML = metas.slice(0, 3).map(function (m) {
      var alvo = num(m.valor_alvo);
      var frac = alvo > 0 ? Math.min(1, num(m.valor_atual) / alvo) : 0;
      return barRow(m.descricao, pct0.format(frac * 100) + '%', frac, true);
    }).join('');
  }

  // ---------- Início ----------
  var usuario = getUsuario();
  var primeiroNome = usuario && usuario.nome ? String(usuario.nome).trim().split(/\s+/)[0] : '';
  document.getElementById('user-first-name').textContent = primeiroNome;

  document.getElementById('dash-retry').addEventListener('click', carregar);

  carregar();
})();
