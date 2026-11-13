// Utilitários das telas internas (formatação, escape, armazenamento local).
(function () {
  var brlCents = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var brlInt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  var mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
  var mesLongo = new Intl.DateTimeFormat('pt-BR', { month: 'long' });

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var U = {
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    num: function (v) { var n = Number(v); return isFinite(n) ? n : 0; },
    // Intl usa espaço não-quebrável entre "R$" e o número (não quebra linha).
    moeda: function (v) { return brlCents.format(Math.abs(v)); },
    moedaInt: function (v) { return brlInt.format(v); },
    moedaSinal: function (v, receita) { return (receita ? '+' : '-') + brlCents.format(Math.abs(v)); },
    mesAbrev: function (d) { return mesCurto.format(d).replace('.', ''); },
    mesNome: function (d) { var m = mesLongo.format(d); return m.charAt(0).toUpperCase() + m.slice(1); },
    diaMes: function (d) { return d.getDate() + ' ' + U.mesAbrev(d); },
    mesmoDia: function (a, b) {
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    },
    mesmoMes: function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); },
    // "1.234,56" | "1234.56" | "R$ 12,5" -> número
    parseValor: function (s) {
      s = String(s || '').replace(/[^\d,.-]/g, '');
      if (s.indexOf(',') !== -1) s = s.replace(/\./g, '').replace(',', '.');
      var n = parseFloat(s);
      return isFinite(n) ? n : NaN;
    },
    // Máscara de moeda enquanto digita: "R$ 1.234,56"
    mascaraMoeda: function (input) {
      input.addEventListener('input', function () {
        var dig = input.value.replace(/\D/g, '').replace(/^0+/, '');
        if (!dig) { input.value = ''; return; }
        while (dig.length < 3) dig = '0' + dig;
        var n = Number(dig.slice(0, -2) + '.' + dig.slice(-2));
        input.value = brlCents.format(n);
      });
    },
    // Date -> "AAAA-MM-DD" (data local)
    isoDia: function (d) {
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    },
    // "AAAA-MM-DD" -> Date ao meio-dia local (evita virar o dia por fuso)
    dataLocal: function (s) {
      var p = String(s).slice(0, 10).split('-');
      return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
    },
    primeiroNome: function () {
      var u = typeof getUsuario === 'function' ? getUsuario() : null;
      return u && u.nome ? String(u.nome).trim().split(/\s+/)[0] : '';
    },
    store: {
      get: function (k, def) {
        var raw = lsGet(k);
        if (!raw) return def;
        try { return JSON.parse(raw); } catch (e) { return def; }
      },
      set: function (k, v) { lsSet(k, JSON.stringify(v)); }
    },
    erroMsg: function (err) {
      var m = (err && err.message) || '';
      if (/reach|connect|failed to fetch|networkerror/i.test(m)) return 'Servidor temporariamente indisponível. Tente mais tarde.';
      return m || 'Algo deu errado. Tente de novo.';
    }
  };

  // "Conta" da transação: o backend não tem esse campo, então fica no navegador.
  var CONTAS_KEY = 'nexum-tx-contas';
  U.CONTAS = ['Conta principal', 'Cartão de crédito'];
  U.contaDe = function (id) { return U.store.get(CONTAS_KEY, {})[id] || U.CONTAS[0]; };
  U.setConta = function (id, conta) {
    var m = U.store.get(CONTAS_KEY, {});
    if (conta) m[id] = conta; else delete m[id];
    U.store.set(CONTAS_KEY, m);
  };

  // Orçamento (limite mensal por categoria): o backend não tem esse recurso, então fica no navegador.
  // Valores iniciais = Figma (Editar orçamento).
  var ORC_KEY = 'nexum-orcamento';
  U.ORCAMENTO_PADRAO = [
    { nome: 'Moradia', limite: 1500 },
    { nome: 'Alimentação', limite: 900 },
    { nome: 'Transporte', limite: 700 },
    { nome: 'Lazer', limite: 500 },
    { nome: 'Saúde', limite: 400 },
    { nome: 'Outros', limite: 700 }
  ];
  U.orcamento = function () {
    var o = U.store.get(ORC_KEY, null);
    return Array.isArray(o) && o.length ? o : U.ORCAMENTO_PADRAO.map(function (c) { return { nome: c.nome, limite: c.limite }; });
  };
  U.setOrcamento = function (lista) { U.store.set(ORC_KEY, lista); };

  window.U = U;
})();
