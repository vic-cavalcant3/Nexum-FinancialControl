// Planejamento: limites por categoria (salvos no navegador) x gastos do mês (API).
// Depende de: js/api.js, js/util.js, js/modal.js, js/icons.js.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var root = $('plp');

  var INFO = {
    'Moradia': { icon: 'cat-home', desc: 'Aluguel e contas fixas' },
    'Alimentação': { icon: 'cat-utensils', desc: 'Mercado e restaurantes' },
    'Transporte': { icon: 'cat-car', desc: 'Combustível e transporte' },
    'Lazer': { icon: 'cat-film', desc: 'Streaming e cinema' },
    'Saúde': { icon: 'cat-health', desc: 'Farmácia e consultas' },
    'Outros': { icon: 'cat-dots', desc: 'Despesas diversas' }
  };
  function info(nome) { return INFO[nome] || { icon: 'cat-dots', desc: '' }; }

  var transacoes = [];
  var categorias = [];

  // ---------- Ícones estáticos ----------
  document.querySelector('.bh-back').innerHTML = ICONS.back;
  document.querySelector('.pl-warn-ic').innerHTML = ICONS.alert;
  document.querySelectorAll('.modal-close').forEach(function (b) { b.innerHTML = ICONS.close; });

  // ---------- Helpers ----------
  function slot(nome, txt) {
    root.querySelectorAll('[data-slot="' + nome + '"]').forEach(function (el) { el.textContent = txt; });
  }
  function skel(w, h) { return '<span class="skel" style="width:' + w + 'px;height:' + h + 'px"></span>'; }
  function moedaSinalInt(v) { return (v < 0 ? '-' : '') + U.moedaInt(Math.abs(v)); }
  function pctClasse(p) { return p > 100 ? 'is-danger' : p >= 85 ? 'is-warning' : ''; }
  function listaNomes(n) {
    return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1];
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }

  // Gasto do mês atual por item do orçamento. Categorias sem limite próprio caem em "Outros".
  function gastosPorItem(orc) {
    var hoje = new Date();
    var nomes = {};
    orc.forEach(function (c) { nomes[c.nome] = true; });
    var g = {}, total = 0;
    transacoes.forEach(function (t) {
      if (t.tipo !== 'despesa' || !U.mesmoMes(t.data, hoje)) return;
      var alvo = nomes[t.categoria] ? t.categoria : (nomes.Outros ? 'Outros' : null);
      total += t.valor;
      if (alvo) g[alvo] = (g[alvo] || 0) + t.valor;
    });
    return { porItem: g, total: total };
  }

  // ---------- Render ----------
  function renderLoading() {
    ['orcado', 'gasto', 'restante'].forEach(function (n) {
      root.querySelectorAll('[data-slot="' + n + '"]').forEach(function (el) { el.innerHTML = skel(90, 20); });
    });
    var card = '<div class="plc"><div class="plc-head"><span class="plc-tile"></span>' + skel(80, 14) + '</div>' +
      '<div class="plc-spent">' + skel(70, 13) + skel(30, 13) + '</div><div class="pbar"></div>' + skel(60, 11) + '</div>';
    $('pl-cards').innerHTML = card + card + card + card;
    $('pl-warn').hidden = true;
  }

  function render() {
    var orc = U.orcamento();
    var g = gastosPorItem(orc);
    var orcado = orc.reduce(function (s, c) { return s + U.num(c.limite); }, 0);
    var restante = orcado - g.total;
    var hoje = new Date();
    var fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    slot('orcado', U.moedaInt(orcado));
    slot('gasto', U.moedaInt(g.total));
    slot('gasto-sub', (orcado > 0 ? Math.round(g.total / orcado * 100) : 0) + '% do orçamento');
    slot('restante', moedaSinalInt(restante));
    slot('restante-sub', 'disponível até ' + p2(fim.getDate()) + '/' + p2(fim.getMonth() + 1));
    var elRest = root.querySelector('[data-slot="restante"]');
    elRest.classList.toggle('is-success', restante >= 0);
    elRest.classList.toggle('is-danger', restante < 0);

    var estourados = [];
    var html = orc.map(function (c, i) {
      var gasto = g.porItem[c.nome] || 0;
      var limite = U.num(c.limite);
      var pct = limite > 0 ? Math.round(gasto / limite * 100) : (gasto > 0 ? 101 : 0);
      if (pct > 100) estourados.push(c.nome);
      var cls = pctClasse(pct);
      var inf = info(c.nome);
      var fill = limite > 0 ? Math.min(100, gasto / limite * 100) : (gasto > 0 ? 100 : 0);
      return '<article class="plc" data-i="' + i + '" data-estourado="' + (pct > 100) + '">' +
        '<div class="plc-head"><span class="plc-tile" aria-hidden="true">' + ICONS[inf.icon] + '</span>' +
          '<div class="plc-titles"><h2 class="plc-name">' + U.esc(c.nome) + '</h2>' +
          (inf.desc ? '<p class="plc-desc only-d">' + U.esc(inf.desc) + '</p>' : '') + '</div></div>' +
        '<div class="plc-spent">' +
          '<span class="plc-spent-value"><span class="only-m">' + U.esc(U.moedaInt(gasto)) + '</span>' +
          '<span class="only-d">Gasto: ' + U.esc(U.moeda(gasto)) + '</span></span>' +
          '<span class="plc-pct ' + cls + '">' + pct + '%</span></div>' +
        '<div class="pbar" role="progressbar" aria-label="' + U.esc(c.nome) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(fill) + '">' +
          '<span class="pbar-fill ' + cls + '" style="width:' + fill.toFixed(2) + '%"></span></div>' +
        '<p class="plc-limit"><span class="only-m">de ' + U.esc(U.moedaInt(limite)) + '</span>' +
          '<span class="only-d">Limite: ' + U.esc(U.moeda(limite)) + '</span></p>' +
        '<button type="button" class="plc-edit only-d" data-editar-i="' + i + '">Editar Limite</button>' +
      '</article>';
    }).join('');

    html += '<button type="button" class="plc-new only-d" id="pl-nova"><span class="plc-new-ic" aria-hidden="true">' +
      ICONS['plus-md'] + '</span>Nova Categoria</button>';
    $('pl-cards').innerHTML = html;

    var warn = $('pl-warn');
    warn.hidden = !estourados.length;
    if (estourados.length) {
      var nomes = listaNomes(estourados);
      var plural = estourados.length > 1;
      warn.querySelector('.pl-warn-text').innerHTML =
        '<span class="only-m">' + U.esc(nomes + (plural ? ' passaram' : ' passou') + ' do limite.') + '</span>' +
        '<span class="only-d">' + U.esc('Atenção: ' + nomes + (plural ? ' ultrapassaram' : ' ultrapassou') + ' o limite este mês.') + '</span>';
    }
  }

  // ---------- Dados ----------
  async function carregar() {
    $('pl-alert').hidden = true;
    renderLoading();
    try {
      var r = await Promise.all([Transacoes.listar(), categorias.length ? categorias : Categorias.listar()]);
      categorias = r[1] || [];
      transacoes = (r[0] || []).map(function (t) {
        return {
          tipo: t.tipo,
          valor: U.num(t.valor),
          data: new Date(t.data),
          categoria: (t.categoria && t.categoria.nome) || ''
        };
      });
    } catch (err) {
      console.error(err);
      transacoes = [];
      $('pl-alert').hidden = false;
    }
    render();
  }
  $('pl-retry').addEventListener('click', carregar);

  // ---------- VER DETALHES ----------
  $('pl-warn-link').addEventListener('click', function () {
    var cards = root.querySelectorAll('.plc[data-estourado="true"]');
    if (!cards.length) return;
    cards[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    cards.forEach(function (c) { c.classList.add('is-highlight'); });
    setTimeout(function () { cards.forEach(function (c) { c.classList.remove('is-highlight'); }); }, 1600);
  });

  // ---------- Modal: editar orçamento ----------
  var modalOrc = $('modal-orc');
  var campos = $('orc-fields');

  function abrirOrcamento(focoIndex) {
    var orc = U.orcamento();
    $('orc-erro').hidden = true;
    campos.innerHTML = orc.map(function (c, i) {
      return '<div class="orc-row"><label class="orc-label" for="orc-' + i + '">' + U.esc(c.nome) + '</label>' +
        '<span class="orc-input"><span aria-hidden="true">R$</span>' +
        '<input id="orc-' + i + '" type="text" inputmode="decimal" autocomplete="off" value="' +
        U.esc(String(U.num(c.limite)).replace('.', ',')) + '" data-nome="' + U.esc(c.nome) + '"></span></div>';
    }).join('');
    campos.querySelectorAll('.orc-input').forEach(function (box) {
      box.addEventListener('click', function () { box.querySelector('input').focus(); });
    });
    var alvo = focoIndex != null ? $('orc-' + focoIndex)
      : (window.matchMedia('(min-width: 1024px)').matches ? $('orc-0') : null);
    campos.querySelectorAll('input').forEach(function (i) { i.removeAttribute('autofocus'); });
    if (alvo) alvo.setAttribute('autofocus', '');
    Modal.open(modalOrc);
    if (alvo) requestAnimationFrame(function () { alvo.select(); });
  }

  document.querySelectorAll('[data-editar]').forEach(function (b) {
    b.addEventListener('click', function () { abrirOrcamento(null); });
  });

  $('pl-cards').addEventListener('click', function (e) {
    var ed = e.target.closest('[data-editar-i]');
    if (ed) { abrirOrcamento(Number(ed.getAttribute('data-editar-i'))); return; }
    if (e.target.closest('#pl-nova')) abrirNovaCategoria();
  });

  function sucesso() {
    showSuccess('Orçamento atualizado!', 'Os novos limites por categoria foram salvos.', null, { botao: 'Ver planejamento', compacto: true });
  }

  $('form-orc').addEventListener('submit', function (e) {
    e.preventDefault();
    var invalido = null;
    var lista = Array.prototype.map.call(campos.querySelectorAll('input'), function (inp) {
      var v = inp.value.trim() === '' ? 0 : U.parseValor(inp.value);
      var ok = isFinite(v) && v >= 0;
      inp.parentNode.classList.toggle('is-error', !ok);
      if (!ok && !invalido) invalido = inp;
      return { nome: inp.getAttribute('data-nome'), limite: Math.round(v * 100) / 100 };
    });
    if (invalido) {
      $('orc-erro').textContent = 'Informe valores válidos (R$ 0 ou mais).';
      $('orc-erro').hidden = false;
      invalido.focus();
      return;
    }
    U.setOrcamento(lista);
    Modal.close(modalOrc, true);
    render();
    sucesso();
  });

  // ---------- Modal: nova categoria ----------
  var modalCat = $('modal-cat');
  var selCat = $('cat-nome'), inLim = $('cat-limite');
  U.mascaraMoeda(inLim);

  function abrirNovaCategoria() {
    var orc = U.orcamento();
    var usados = {};
    orc.forEach(function (c) { usados[c.nome] = true; });
    var vistos = {};
    var livres = categorias.filter(function (c) {
      if (c.tipo !== 'despesa' || usados[c.nome] || vistos[c.nome]) return false;
      vistos[c.nome] = true;
      return true;
    });
    selCat.innerHTML = livres.length
      ? livres.map(function (c) { return '<option value="' + U.esc(c.nome) + '">' + U.esc(c.nome) + '</option>'; }).join('')
      : '<option value="">Todas as categorias já têm limite</option>';
    selCat.disabled = !livres.length;
    inLim.value = '';
    $('cat-erro').hidden = true;
    Modal.open(modalCat);
  }

  $('form-cat').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('cat-erro');
    var v = U.parseValor(inLim.value);
    if (!selCat.value) { err.textContent = 'Não há categorias de despesa sem limite.'; err.hidden = false; return; }
    if (!(v > 0)) { err.textContent = 'Informe um limite maior que zero.'; err.hidden = false; inLim.focus(); return; }
    var orc = U.orcamento();
    var iOutros = -1;
    orc.forEach(function (c, i) { if (c.nome === 'Outros') iOutros = i; });
    var item = { nome: selCat.value, limite: v };
    if (iOutros === -1) orc.push(item); else orc.splice(iOutros, 0, item);
    U.setOrcamento(orc);
    Modal.close(modalCat, true);
    render();
    sucesso();
  });

  carregar();
})();
