// Relatórios: médias, economia, gráfico receitas x despesas e ranking por categoria.
// Depende de: js/api.js, js/util.js.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var root = $('rlp');
  var pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

  var transacoes = [];

  function slot(nome, txt) {
    root.querySelectorAll('[data-slot="' + nome + '"]').forEach(function (el) { el.textContent = txt; });
  }
  function slotEl(nome) { return root.querySelector('[data-slot="' + nome + '"]'); }
  function skel(w, h) { return '<span class="skel" style="width:' + w + 'px;height:' + h + 'px"></span>'; }
  // Figma usa "R$ 9000" (sem separador de milhar) no ranking.
  function moedaSimples(v) { return 'R$ ' + Math.round(v); }

  function meses() { return Number($('rl-periodo').value) || 6; }

  // ---------- Cálculo ----------
  function calcular(n) {
    var hoje = new Date();
    var lista = [];
    for (var i = n - 1; i >= 0; i--) {
      lista.push({ ref: new Date(hoje.getFullYear(), hoje.getMonth() - i, 1), rec: 0, desp: 0 });
    }
    var inicio = lista[0].ref;
    var cats = {};
    transacoes.forEach(function (t) {
      if (t.data < inicio) return;
      for (var j = 0; j < lista.length; j++) {
        if (U.mesmoMes(t.data, lista[j].ref)) {
          if (t.tipo === 'receita') lista[j].rec += t.valor;
          else if (t.tipo === 'despesa') {
            lista[j].desp += t.valor;
            cats[t.categoria] = (cats[t.categoria] || 0) + t.valor;
          }
          break;
        }
      }
    });
    var ranking = Object.keys(cats).map(function (k) { return { nome: k, valor: cats[k] }; })
      .sort(function (a, b) { return b.valor - a.valor; });
    return { meses: lista, ranking: ranking };
  }

  // Variação do primeiro para o último mês do período; null se não dá para comparar.
  function variacao(primeiro, ultimo) {
    if (!(primeiro > 0)) return null;
    return (ultimo - primeiro) / primeiro * 100;
  }

  function setDelta(nome, v, n, menorEhMelhor) {
    var el = slotEl(nome);
    el.classList.remove('is-good', 'is-bad');
    if (v === null || !isFinite(v)) { el.textContent = ''; el.hidden = true; return; }
    el.hidden = false;
    el.textContent = (v >= 0 ? '↑ ' : '↓ ') + pct.format(Math.abs(v)) + '% nos últimos ' + n + ' meses';
    var bom = menorEhMelhor ? v <= 0 : v >= 0;
    el.classList.add(bom ? 'is-good' : 'is-bad');
  }

  // ---------- Render ----------
  function renderLoading() {
    ['receita', 'despesa', 'economia', 'top'].forEach(function (n) { slotEl(n).innerHTML = skel(110, 22); });
    ['receita-delta', 'despesa-delta', 'economia-delta', 'top-sub'].forEach(function (n) { slotEl(n).innerHTML = skel(140, 12); });
    var alt = [0.7, 0.8, 0.65, 0.9, 0.75, 1];
    $('rl-bars').innerHTML = alt.map(function (a) {
      return '<div class="rl-col"><div class="rl-pair"><span class="rl-bar skel" style="height:calc(var(--bar-max) * ' + a + ')"></span>' +
        '<span class="rl-bar is-expense skel" style="height:calc(var(--bar-max) * ' + (a * 0.6) + ')"></span></div>' +
        '<span class="rl-month">' + skel(18, 10) + '</span></div>';
    }).join('');
    $('rl-rank').innerHTML = [0.9, 0.6, 0.4].map(function (f) {
      return '<li class="rl-rank-row"><div class="rl-rank-main"><div class="rl-rank-head">' + skel(90, 13) + '</div>' +
        '<div class="rl-track"><span class="rl-fill skel" style="--f:' + f + '"></span></div></div></li>';
    }).join('');
  }

  function render() {
    var n = meses();
    var r = calcular(n);
    var m = r.meses;

    var totRec = 0, totDesp = 0;
    m.forEach(function (x) { totRec += x.rec; totDesp += x.desp; });
    var eco = totRec - totDesp;

    slot('receita', U.moedaInt(totRec / n));
    slot('despesa', U.moedaInt(totDesp / n));
    slot('economia', (eco < 0 ? '-' : '') + U.moedaInt(Math.abs(eco)));

    var p = m[0], u = m[m.length - 1];
    setDelta('receita-delta', variacao(p.rec, u.rec), n, false);
    setDelta('despesa-delta', variacao(p.desp, u.desp), n, true);
    setDelta('economia-delta', variacao(p.rec - p.desp, u.rec - u.desp), n, false);

    var top = r.ranking[0];
    slot('top', top ? top.nome : '—');
    slot('top-sub', top ? U.moedaInt(top.valor) + ' no período' : 'Sem despesas no período');

    slot('chart-title', 'Receitas vs Despesas · ' + n + ' meses');
    slot('rank-title', 'Onde seu dinheiro mais foi (últimos ' + n + ' meses)');

    // Gráfico: altura relativa ao maior valor do período (receita ou despesa).
    var max = 0;
    m.forEach(function (x) { max = Math.max(max, x.rec, x.desp); });
    $('rl-bars').innerHTML = m.map(function (x) {
      var fr = max ? x.rec / max : 0, fd = max ? x.desp / max : 0;
      var mes = U.mesAbrev(x.ref);
      mes = mes.charAt(0).toUpperCase() + mes.slice(1);
      var label = mes + ': receitas ' + U.moedaInt(x.rec) + ', despesas ' + U.moedaInt(x.desp);
      return '<div class="rl-col" title="' + U.esc(label) + '"><div class="rl-pair">' +
        '<span class="rl-bar" style="height:calc(var(--bar-max) * ' + fr.toFixed(4) + ')"></span>' +
        '<span class="rl-bar is-expense" style="height:calc(var(--bar-max) * ' + fd.toFixed(4) + ')"></span></div>' +
        '<span class="rl-month">' + U.esc(mes) + '</span></div>';
    }).join('');
    $('rl-bars').setAttribute('aria-label', 'Receitas e despesas por mês. ' + m.map(function (x) {
      return U.mesNome(x.ref) + ': receitas ' + U.moedaInt(x.rec) + ', despesas ' + U.moedaInt(x.desp);
    }).join('; '));

    // Ranking: 3 no mobile, 6 no desktop.
    var rk = r.ranking.slice(0, 6);
    var maior = rk.length ? rk[0].valor : 0;
    $('rl-rank').innerHTML = rk.length ? rk.map(function (c, i) {
      return '<li class="rl-rank-row' + (i >= 3 ? ' only-d' : '') + '">' +
        '<span class="rl-rank-n only-d">' + (i + 1) + '</span>' +
        '<div class="rl-rank-main"><div class="rl-rank-head"><span class="rl-rank-name">' + U.esc(c.nome) + '</span>' +
          '<span class="rl-rank-value only-m">' + U.esc(moedaSimples(c.valor)) + '</span></div>' +
          '<div class="rl-track"><span class="rl-fill" style="--f:' + (maior ? c.valor / maior : 0).toFixed(4) + '"></span></div></div>' +
        '<span class="rl-rank-value only-d">' + U.esc(moedaSimples(c.valor)) + '</span>' +
      '</li>';
    }).join('') : '<li class="rl-empty">Nenhuma despesa no período.</li>';
  }

  // ---------- Dados ----------
  async function carregar() {
    $('rl-alert').hidden = true;
    renderLoading();
    try {
      transacoes = (await Transacoes.listar() || []).map(function (t) {
        return {
          tipo: t.tipo,
          valor: U.num(t.valor),
          data: new Date(t.data),
          categoria: (t.categoria && t.categoria.nome) || 'Sem categoria'
        };
      });
      render();
    } catch (err) {
      console.error(err);
      $('rl-alert').hidden = false;
    }
  }

  $('rl-retry').addEventListener('click', carregar);

  $('rl-periodo').addEventListener('change', function (e) {
    var sel = e.target;
    sel.parentNode.querySelector('.filter-text').textContent = sel.options[sel.selectedIndex].textContent;
    render();
  });

  // Exportar PDF: usa a impressão do navegador ("Salvar como PDF"); o CSS de impressão esconde a navegação.
  $('rl-export').addEventListener('click', function () { window.print(); });

  carregar();
})();
