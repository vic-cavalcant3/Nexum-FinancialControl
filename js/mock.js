// MODO MOCK — desenvolve o front sem backend.
// Carregar logo DEPOIS de js/api.js. Não altera o api.js: só substitui window.apiFetch.
//
// Liga com ?mock=1 (fica salvo) ou rodando em localhost/127.0.0.1. ?mock=0 desliga (remove o salvo).
// Dados em memória, persistidos em localStorage 'nexum-mock-db'.
// Console: nexumMock.reset() recria os dados iniciais.
(function () {
  var FLAG_KEY = 'nexum-mock';
  var DB_KEY = 'nexum-mock-db';
  var DELAY = 400;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  var param = new URLSearchParams(window.location.search).get('mock');
  if (param === '1') lsSet(FLAG_KEY, '1');
  if (param === '0') lsDel(FLAG_KEY);

  var host = window.location.hostname;
  var local = host === 'localhost' || host === '127.0.0.1';
  var enabled = param !== '0' && (lsGet(FLAG_KEY) === '1' || local);
  if (!enabled) return;

  // ===================== DADOS INICIAIS =====================
  var USUARIO = { id_usuario: 1, nome: 'Vic Cavalcante', email: 'vic@nexum.app' };

  var CATEGORIAS = [
    { nome: 'Alimentação', tipo: 'despesa', icone: 'utensils' },
    { nome: 'Moradia', tipo: 'despesa', icone: 'home' },
    { nome: 'Transporte', tipo: 'despesa', icone: 'car' },
    { nome: 'Lazer', tipo: 'despesa', icone: 'film' },
    { nome: 'Saúde', tipo: 'despesa', icone: 'heart' },
    { nome: 'Educação', tipo: 'despesa', icone: 'book' },
    { nome: 'Compras', tipo: 'despesa', icone: 'bag' },
    { nome: 'Outros', tipo: 'despesa', icone: 'dots' },
    { nome: 'Receita', tipo: 'receita', icone: 'wallet' },
    { nome: 'Salário', tipo: 'receita', icone: 'wallet' },
    { nome: 'Freelance', tipo: 'receita', icone: 'briefcase' },
    { nome: 'Investimentos', tipo: 'receita', icone: 'trending-up' }
  ];

  function seed() {
    var hoje = new Date();
    var Y = hoje.getFullYear(), M = hoje.getMonth();
    var db = {
      usuario: Object.assign({}, USUARIO),
      categorias: [],
      transacoes: [],
      metas: [],
      seq: { categoria: 0, transacao: 0, meta: 0 }
    };

    CATEGORIAS.forEach(function (c) {
      db.categorias.push({ id: ++db.seq.categoria, usuario_id: null, nome: c.nome, tipo: c.tipo, icone: c.icone });
    });
    function catId(nome) {
      for (var i = 0; i < db.categorias.length; i++) if (db.categorias[i].nome === nome) return db.categorias[i].id;
      return null;
    }

    // offset = meses atrás (0 = mês atual)
    function tx(offset, dia, hh, mm, tipo, descricao, valor, categoria) {
      var data = new Date(Y, M - offset, dia, hh, mm);
      db.transacoes.push({
        id_transacao: ++db.seq.transacao,
        usuario_id: 1,
        categoria_id: catId(categoria),
        tipo: tipo,
        descricao: descricao,
        valor: valor,
        data: data.toISOString(),
        criado_em: data.toISOString()
      });
    }

    // ---- Mês atual: receitas 9.120 | despesas 4.680 ----
    tx(0, 5, 9, 0, 'receita', 'Pagamento mensal', 6800, 'Salário');
    tx(0, 15, 16, 20, 'receita', 'Freelance site institucional', 1070, 'Freelance');
    tx(0, 22, 14, 5, 'receita', 'Salário', 1250, 'Receita');

    tx(0, 5, 8, 0, 'despesa', 'Aluguel', 1500, 'Moradia');

    tx(0, 24, 10, 15, 'despesa', 'Mercado São Luiz', 58.9, 'Alimentação');
    tx(0, 8, 19, 10, 'despesa', 'Supermercado Extra', 512.4, 'Alimentação');
    tx(0, 12, 20, 45, 'despesa', 'iFood', 86.7, 'Alimentação');
    tx(0, 17, 7, 50, 'despesa', 'Padaria Pão Quente', 42, 'Alimentação');
    tx(0, 19, 13, 0, 'despesa', 'Restaurante Japonês', 280, 'Alimentação');

    tx(0, 23, 18, 42, 'despesa', 'Assinatura streaming', 29.99, 'Lazer');
    tx(0, 10, 21, 0, 'despesa', 'Show no Ibirapuera', 450, 'Lazer');
    tx(0, 14, 19, 30, 'despesa', 'Cinema', 96, 'Lazer');
    tx(0, 18, 22, 15, 'despesa', 'Bar com amigos', 144.01, 'Lazer');

    tx(0, 21, 9, 30, 'despesa', 'Posto de gasolina', 45, 'Transporte');
    tx(0, 3, 8, 10, 'despesa', 'Combustível', 290, 'Transporte');
    tx(0, 9, 23, 40, 'despesa', 'Uber', 85, 'Transporte');
    tx(0, 16, 12, 0, 'despesa', 'Estacionamento mensal', 200, 'Transporte');

    tx(0, 2, 7, 0, 'despesa', 'Academia', 250, 'Saúde');
    tx(0, 11, 17, 25, 'despesa', 'Farmácia', 160, 'Saúde');
    tx(0, 7, 20, 0, 'despesa', 'Curso online', 300, 'Educação');
    tx(0, 13, 15, 35, 'despesa', 'Livraria', 150, 'Compras');

    // ---- Meses anteriores ----
    // [receita, despesa]. Mês -1 = 8.492 / 4.865 → variações de +7,4% e −3,8%.
    var historico = { 1: [8492, 4865], 2: [8500, 3320], 3: [8500, 4985], 4: [8500, 4430], 5: [8500, 5540] };
    var divisao = [['Moradia', 'Aluguel', 0.31], ['Alimentação', 'Supermercado', 0.22], ['Transporte', 'Combustível', 0.13],
      ['Lazer', 'Lazer e passeios', 0.12], ['Saúde', 'Farmácia', 0.08], ['Educação', 'Curso online', 0.07], ['Compras', 'Compras diversas', 0.07]];

    Object.keys(historico).forEach(function (k) {
      var off = Number(k), rec = historico[k][0], desp = historico[k][1];
      tx(off, 5, 9, 0, 'receita', 'Pagamento mensal', 6800, 'Salário');
      tx(off, 18, 16, 0, 'receita', 'Freelance', Math.round((rec - 6800) * 100) / 100, 'Freelance');
      var acumulado = 0;
      divisao.forEach(function (d, i) {
        var v = i === divisao.length - 1
          ? Math.round((desp - acumulado) * 100) / 100
          : Math.round(desp * d[2] * 100) / 100;
        acumulado += v;
        tx(off, 3 + i * 3, 10 + i, 0, 'despesa', d[1], v, d[0]);
      });
    });

    // Ajuste de saldo inicial (mês −6, fora do gráfico) para o saldo total fechar em R$ 18.450.
    tx(6, 10, 12, 0, 'despesa', 'Quitação do cartão de crédito', 5342, 'Outros');

    // ---- Metas (ordem = data_prazo asc, como no backend) ----
    function meta(descricao, alvo, atual, aporte, mesesPrazo) {
      db.metas.push({
        id_meta: ++db.seq.meta,
        id_usuario: 1,
        descricao: descricao,
        valor_alvo: alvo,
        valor_atual: atual,
        aporte_mensal: aporte,
        data_inicio: new Date(Date.UTC(Y, M - 6, 1)).toISOString(),
        data_prazo: new Date(Date.UTC(Y, M + mesesPrazo, 1)).toISOString(),
        status_meta: 'em_andamento'
      });
    }
    meta('Viagem', 10000, 6900, 600, 6);       // 69%
    meta('Reserva de emergência', 15000, 10950, 800, 8); // 73%
    meta('Notebook novo', 6000, 2820, 400, 10);  // 47%

    return db;
  }

  var db;
  function load() {
    var raw = lsGet(DB_KEY);
    if (raw) { try { db = JSON.parse(raw); return; } catch (e) {} }
    db = seed();
    save();
  }
  function save() { lsSet(DB_KEY, JSON.stringify(db)); }
  load();

  // ===================== SERIALIZAÇÃO (formato Prisma) =====================
  // Prisma serializa Decimal como string.
  function dec(v) { return v == null ? v : String(Number(v)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function outCategoria(c) { return c ? clone(c) : null; }
  function findCategoria(id) {
    for (var i = 0; i < db.categorias.length; i++) if (db.categorias[i].id === id) return db.categorias[i];
    return null;
  }
  function outTransacao(t, incluirCategoria) {
    var o = clone(t);
    o.valor = dec(t.valor);
    if (incluirCategoria) o.categoria = outCategoria(findCategoria(t.categoria_id));
    return o;
  }
  function outMeta(m) {
    var o = clone(m);
    o.valor_alvo = dec(m.valor_alvo);
    o.valor_atual = dec(m.valor_atual);
    o.aporte_mensal = dec(m.aporte_mensal);
    return o;
  }

  // ===================== ROTAS =====================
  function erro(msg) { var e = new Error(msg); throw e; }

  function intervaloMes(mes, ano) {
    return { inicio: new Date(ano, mes - 1, 1), fim: new Date(ano, mes, 0, 23, 59, 59) };
  }

  function noIntervalo(iso, r) { var d = new Date(iso); return d >= r.inicio && d <= r.fim; }

  function porId(lista, campo, id) {
    for (var i = 0; i < lista.length; i++) if (lista[i][campo] === id) return i;
    return -1;
  }

  // Campos que o Prisma aceitaria em update (ignora o resto)
  function aplicar(alvo, body, campos) {
    campos.forEach(function (c) { if (Object.prototype.hasOwnProperty.call(body, c)) alvo[c] = body[c]; });
  }

  function handle(method, path, query, body) {
    var m;

    // ---- Auth ----
    if (method === 'POST' && path === '/auth/login') {
      if (!body.email || !body.senha) erro('Credenciais inválidas.');
      return { usuario: clone(db.usuario) };
    }
    if (method === 'POST' && path === '/auth/registrar') {
      return { usuario: clone(db.usuario) };
    }
    if (method === 'PUT' && path === '/auth/perfil') {
      aplicar(db.usuario, body, ['nome', 'email']);
      save();
      return clone(db.usuario);
    }
    if (method === 'PUT' && path === '/auth/trocar-senha') {
      if (!body.senha_atual) erro('Senha atual incorreta.');
      return { mensagem: 'Senha alterada com sucesso.' };
    }

    // ---- Transações ----
    if (method === 'GET' && path === '/transacoes/resumo') {
      var hoje = new Date();
      var r = intervaloMes(Number(query.mes) || hoje.getMonth() + 1, Number(query.ano) || hoje.getFullYear());
      var receitas = 0, despesas = 0;
      db.transacoes.forEach(function (t) {
        if (!noIntervalo(t.data, r)) return;
        if (t.tipo === 'receita') receitas += Number(t.valor);
        if (t.tipo === 'despesa') despesas += Number(t.valor);
      });
      return { receitas: receitas, despesas: despesas, saldo: receitas - despesas };
    }
    if (method === 'GET' && path === '/transacoes/relatorio') {
      return db.transacoes.slice()
        .sort(function (a, b) { return new Date(a.data) - new Date(b.data); })
        .map(function (t) { return outTransacao(t, true); });
    }
    if (method === 'GET' && path === '/transacoes') {
      var lista = db.transacoes.slice();
      if (query.mes && query.ano) {
        var ri = intervaloMes(Number(query.mes), Number(query.ano));
        lista = lista.filter(function (t) { return noIntervalo(t.data, ri); });
      }
      if (query.tipo) lista = lista.filter(function (t) { return t.tipo === query.tipo; });
      if (query.categoria_id) lista = lista.filter(function (t) { return t.categoria_id === parseInt(query.categoria_id, 10); });
      return lista
        .sort(function (a, b) { return new Date(b.data) - new Date(a.data); })
        .map(function (t) { return outTransacao(t, true); });
    }
    if (method === 'POST' && path === '/transacoes') {
      var nova = {
        id_transacao: ++db.seq.transacao,
        usuario_id: 1,
        tipo: body.tipo,
        descricao: body.descricao,
        valor: Number(body.valor),
        data: new Date(body.data).toISOString(),
        categoria_id: body.categoria_id ? Number(body.categoria_id) : null,
        criado_em: new Date().toISOString()
      };
      db.transacoes.push(nova);
      save();
      return outTransacao(nova, false);
    }
    if ((m = path.match(/^\/transacoes\/(\d+)$/))) {
      var it = porId(db.transacoes, 'id_transacao', parseInt(m[1], 10));
      if (it === -1) erro('Registro não encontrado.');
      if (method === 'PUT') {
        var t = db.transacoes[it];
        aplicar(t, body, ['tipo', 'descricao', 'valor', 'data', 'categoria_id']);
        if (body.valor != null) t.valor = Number(body.valor);
        if (body.data) t.data = new Date(body.data).toISOString();
        save();
        return outTransacao(t, false);
      }
      if (method === 'DELETE') {
        db.transacoes.splice(it, 1);
        save();
        return { mensagem: 'Transação removida.' };
      }
    }

    // ---- Categorias ----
    if (method === 'GET' && path === '/categorias') {
      return db.categorias.slice()
        .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); })
        .map(outCategoria);
    }
    if (method === 'POST' && path === '/categorias') {
      var dup = db.categorias.some(function (c) {
        return c.usuario_id === 1 && c.nome === body.nome && c.tipo === body.tipo;
      });
      if (dup) erro('Você já tem uma categoria com esse nome e tipo.');
      var cat = { id: ++db.seq.categoria, usuario_id: 1, nome: body.nome, tipo: body.tipo, icone: body.icone || null };
      db.categorias.push(cat);
      save();
      return outCategoria(cat);
    }
    if ((m = path.match(/^\/categorias\/(\d+)$/)) && method === 'DELETE') {
      var ic = porId(db.categorias, 'id', parseInt(m[1], 10));
      if (ic === -1 || db.categorias[ic].usuario_id !== 1) erro('Registro não encontrado.');
      var idCat = db.categorias[ic].id;
      db.categorias.splice(ic, 1);
      // onDelete: SetNull
      db.transacoes.forEach(function (t) { if (t.categoria_id === idCat) t.categoria_id = null; });
      save();
      return { mensagem: 'Categoria removida.' };
    }

    // ---- Metas ----
    if (method === 'GET' && path === '/metas') {
      return db.metas.slice()
        .sort(function (a, b) { return new Date(a.data_prazo) - new Date(b.data_prazo); })
        .map(outMeta);
    }
    if (method === 'POST' && path === '/metas') {
      var meta = {
        id_meta: ++db.seq.meta,
        id_usuario: 1,
        descricao: body.descricao,
        valor_alvo: parseFloat(body.valor_alvo),
        valor_atual: parseFloat(body.valor_atual || 0),
        aporte_mensal: parseFloat(body.aporte_mensal || 0),
        data_inicio: new Date(body.data_inicio || new Date()).toISOString(),
        data_prazo: new Date(body.data_prazo).toISOString(),
        status_meta: 'em_andamento'
      };
      db.metas.push(meta);
      save();
      return outMeta(meta);
    }
    if ((m = path.match(/^\/metas\/(\d+)$/))) {
      var im = porId(db.metas, 'id_meta', parseInt(m[1], 10));
      if (im === -1) erro('Registro não encontrado.');
      if (method === 'PUT') {
        var mt = db.metas[im];
        aplicar(mt, body, ['descricao', 'valor_alvo', 'valor_atual', 'aporte_mensal', 'data_inicio', 'data_prazo', 'status_meta']);
        ['valor_alvo', 'valor_atual', 'aporte_mensal'].forEach(function (c) { if (body[c] != null) mt[c] = Number(body[c]); });
        save();
        return outMeta(mt);
      }
      if (method === 'DELETE') {
        db.metas.splice(im, 1);
        save();
        return { mensagem: 'Meta removida.' };
      }
    }

    // ---- Admin ----
    if (method === 'POST' && path === '/admin/verificar-senha') {
      if (!body.senha) erro('Senha incorreta.');
      return { ok: true };
    }
    if (method === 'GET' && path === '/admin/usuarios') {
      return [{
        id_usuario: db.usuario.id_usuario, nome: db.usuario.nome, email: db.usuario.email,
        telefone: null, ativo: true, criado_em: new Date().toISOString(),
        _count: { transacoes: db.transacoes.length, metas: db.metas.length }
      }];
    }
    if (path.match(/^\/admin\/usuarios\/\d+$/) && method === 'DELETE') {
      erro('Você não pode apagar sua própria conta de admin por aqui.');
    }

    erro('Rota não encontrada no mock: ' + method + ' ' + path);
  }

  // ===================== apiFetch FALSO =====================
  window.apiFetch = function (endpoint, options) {
    options = options || {};
    var method = (options.method || 'GET').toUpperCase();
    var url = new URL(endpoint, 'http://mock.local');
    var query = {};
    url.searchParams.forEach(function (v, k) { query[k] = v; });
    var body = {};
    if (options.body) { try { body = JSON.parse(options.body); } catch (e) {} }

    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try { resolve(handle(method, url.pathname, query, body)); }
        catch (e) { reject(e); }
      }, DELAY);
    });
  };

  window.nexumMock = {
    reset: function () { db = seed(); save(); return 'Mock recriado.'; },
    db: function () { return db; }
  };

  // ===================== SELO "MOCK" =====================
  function badge() {
    if (document.querySelector('.mock-badge')) return;
    var el = document.createElement('div');
    el.className = 'mock-badge';
    el.textContent = 'MOCK';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  if (document.body) badge();
  else document.addEventListener('DOMContentLoaded', badge);
})();
