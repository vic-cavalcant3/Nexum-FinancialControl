// MODO MOCK — desenvolve o front sem backend.
// Carregar logo DEPOIS de js/api.js. Não altera o api.js: só substitui window.apiFetch.
//
// Liga com ?mock=1 (fica salvo), rodando em localhost/127.0.0.1 ou no deploy de teste
// (nexumweb.onrender.com, enquanto MOCK_NO_DEPLOY = true). ?mock=0 desliga (remove o salvo).
// Dados em memória, persistidos em localStorage 'nexum-mock-db'.
// Console: nexumMock.reset() recria os dados iniciais.
(function () {
  // Deploy de teste no Render (sem backend). Mude para false quando o backend em Java estiver no ar.
  var MOCK_NO_DEPLOY = true;
  var DEPLOY_HOST = 'nexumweb.onrender.com';

  var FLAG_KEY = 'nexum-mock';
  var DB_KEY = 'nexum-mock-db';
  var DELAY = 400;
  var VERSION = 3; // mude para recriar os dados salvos

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  // ===================== CONSULTOR IA (simulado) =====================
  // Não existe endpoint de IA no backend: as respostas são montadas aqui, com atraso,
  // a partir dos dados reais do usuário (Transacoes / Metas do js/api.js).
  // Fica fora da chave do mock: o Consultor funciona com ou sem backend.
  // Uso: consultorSimulado('Como economizar mais?').then(texto => ...)
  (function () {
    var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    var pctF = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
    function n(v) { v = Number(v); return isFinite(v) ? v : 0; }
    function semAcento(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    function mesmoMes(d, ref) { return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth(); }

    function resumo(txs) {
      var hoje = new Date();
      var ant = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      var r = { rec: 0, desp: 0, recAnt: 0, despAnt: 0, cats: {}, catsAnt: {}, meses: {} };
      txs.forEach(function (t) {
        var d = new Date(t.data), v = n(t.valor), cat = (t.categoria && t.categoria.nome) || 'Outros';
        var k = d.getFullYear() * 12 + d.getMonth();
        r.meses[k] = r.meses[k] || { rec: 0, desp: 0 };
        if (t.tipo === 'receita') r.meses[k].rec += v; else r.meses[k].desp += v;
        if (mesmoMes(d, hoje)) {
          if (t.tipo === 'receita') r.rec += v; else { r.desp += v; r.cats[cat] = (r.cats[cat] || 0) + v; }
        } else if (mesmoMes(d, ant)) {
          if (t.tipo === 'receita') r.recAnt += v; else { r.despAnt += v; r.catsAnt[cat] = (r.catsAnt[cat] || 0) + v; }
        }
      });
      // Economia média mensal dos meses com movimento (até 6)
      var ks = Object.keys(r.meses).map(Number).sort().slice(-6);
      r.ecoMedia = ks.length ? ks.reduce(function (s, k) { return s + r.meses[k].rec - r.meses[k].desp; }, 0) / ks.length : 0;
      return r;
    }

    function topCategoria(cats) {
      var top = null;
      Object.keys(cats).forEach(function (c) { if (!top || cats[c] > cats[top]) top = c; });
      return top;
    }

    function economizar(r) {
      var top = topCategoria(r.cats);
      if (!top) return 'Ainda não encontrei despesas neste mês. Registre seus gastos em Transações e eu te mostro onde dá pra economizar.';
      var corte = Math.round(r.cats[top] * 0.1 / 10) * 10;
      var taxa = r.rec > 0 ? (r.rec - r.desp) / r.rec * 100 : 0;
      return 'Seu maior gasto este mês é ' + top + ' (' + brl.format(r.cats[top]) + '). Cortando 10% dali, você guarda ' +
        brl.format(corte) + ' a mais por mês. Hoje você economiza ' + pctF.format(Math.max(0, taxa)) +
        '% da sua renda — a meta ideal é chegar a 20%. Quer que eu ajuste esse limite no Planejamento?';
    }

    function aposentadoria(r) {
      var mensal = Math.max(0, r.ecoMedia);
      if (!mensal) return 'Para simular sua aposentadoria preciso de alguns meses de receitas e despesas registradas. Que tal começar por Transações?';
      // 25 anos, 0,6% ao mês
      var i = 0.006, m = 25 * 12;
      var total = mensal * ((Math.pow(1 + i, m) - 1) / i);
      var renda = total * 0.004;
      return 'Se você investir ' + brl.format(mensal) + ' por mês (sua economia média) a 0,6% ao mês, em 25 anos terá cerca de ' +
        brl.format(total) + '. Isso gera uma renda de aproximadamente ' + brl.format(renda) + ' por mês sem mexer no principal.';
    }

    function metaViagem(metas) {
      var m = metas.filter(function (x) { return /viagem|viajar|ferias/.test(semAcento(x.descricao)); })[0] || metas[0];
      if (!m) return 'Você ainda não tem metas. Crie uma em Metas e eu acompanho o seu ritmo com você.';
      var alvo = n(m.valor_alvo), atual = n(m.valor_atual), aporte = n(m.aporte_mensal);
      var faltam = Math.max(0, alvo - atual);
      if (!faltam) return 'Parabéns! A meta "' + m.descricao + '" já foi alcançada.';
      var meses = aporte > 0 ? Math.ceil(faltam / aporte) : null;
      return 'Sua meta "' + m.descricao + '" está em ' + pctF.format(alvo ? atual / alvo * 100 : 0) + '%: faltam ' + brl.format(faltam) + '. ' +
        (meses ? 'Guardando ' + brl.format(aporte) + ' por mês, você chega lá em ' + meses + (meses === 1 ? ' mês' : ' meses') +
          '. Aumentando para ' + brl.format(Math.ceil(aporte * 1.25 / 10) * 10) + ', antecipa em cerca de ' +
          Math.max(1, meses - Math.ceil(faltam / (aporte * 1.25))) + ' mês(es).' : 'Defina um valor mensal para eu calcular o prazo.');
    }

    function gastos(r) {
      var linhas = Object.keys(r.cats).sort(function (a, b) { return r.cats[b] - r.cats[a]; }).slice(0, 3)
        .map(function (c) { return c + ' (' + brl.format(r.cats[c]) + ')'; });
      var v = r.despAnt ? (r.desp - r.despAnt) / r.despAnt * 100 : null;
      return 'Neste mês você gastou ' + brl.format(r.desp) + (v !== null ? ' — ' + (v >= 0 ? 'alta' : 'queda') + ' de ' + pctF.format(Math.abs(v)) + '% em relação ao mês passado' : '') +
        '. ' + (linhas.length ? 'Os maiores gastos foram: ' + linhas.join(', ') + '.' : '');
    }

    function saldo(r) {
      var eco = r.rec - r.desp;
      return 'Este mês entraram ' + brl.format(r.rec) + ' e saíram ' + brl.format(r.desp) + ', então você está ' +
        (eco >= 0 ? 'com ' + brl.format(eco) + ' de sobra.' : 'no vermelho em ' + brl.format(-eco) + '. Vale revisar os gastos em Planejamento.');
    }

    function responder(texto, txs, metas) {
      var q = semAcento(texto);
      var r = resumo(txs);
      if (/aposent/.test(q)) return aposentadoria(r);
      if (/meta|viagem|objetivo/.test(q)) return metaViagem(metas);
      if (/econom|poupar|guardar|cortar|reduzir/.test(q)) return economizar(r);
      if (/gast|despes|categoria|onde/.test(q)) return gastos(r);
      if (/saldo|sobr|receit|renda|quanto/.test(q)) return saldo(r);
      if (/sim|pode|aplicar|ok|quero/.test(q)) return 'Combinado! Você pode revisar e salvar os novos limites em Planejamento → Editar orçamento.';
      if (/oi|ola|bom dia|boa tarde|boa noite/.test(q)) return 'Oi! Posso analisar seus gastos, sugerir onde economizar, acompanhar suas metas ou simular sua aposentadoria. Por onde começamos?';
      return 'Ainda estou aprendendo sobre esse assunto. Posso te ajudar com seus gastos, economia, metas ou aposentadoria — é só perguntar.';
    }

    window.consultorSimulado = function (texto) {
      var espera = 900 + Math.min(1200, String(texto).length * 15);
      var dados = Promise.all([
        typeof Transacoes !== 'undefined' ? Transacoes.listar().catch(function () { return []; }) : [],
        typeof Metas !== 'undefined' ? Metas.listar().catch(function () { return []; }) : []
      ]);
      return Promise.all([dados, new Promise(function (r) { setTimeout(r, espera); })]).then(function (res) {
        return responder(texto, res[0][0] || [], res[0][1] || []);
      });
    };
  })();

  var param = new URLSearchParams(window.location.search).get('mock');
  if (param === '1') lsSet(FLAG_KEY, '1');
  if (param === '0') lsDel(FLAG_KEY);

  var host = window.location.hostname;
  var local = host === 'localhost' || host === '127.0.0.1';
  var deploy = host === DEPLOY_HOST;
  var enabled = param !== '0' && (lsGet(FLAG_KEY) === '1' || local || (deploy && MOCK_NO_DEPLOY));
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
      version: VERSION,
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

    // Transações recentes do Figma (Transações): N dias atrás, sem sair do mês atual.
    var D = hoje.getDate();
    function txRecente(diasAtras, hh, mm, tipo, descricao, valor, categoria, conta) {
      var dia = Math.max(1, D - diasAtras);
      tx(0, dia, hh, mm, tipo, descricao, valor, categoria);
      contas[db.seq.transacao] = conta;
    }
    // Demais transações do mês: nunca no futuro nem nos dias das recentes.
    function txMes(dia, hh, mm, tipo, descricao, valor, categoria) {
      tx(0, Math.max(1, Math.min(dia, D - 5)), hh, mm, tipo, descricao, valor, categoria);
    }
    var contas = {};

    // ---- Mês atual: receitas 9.120 | despesas 4.680 ----
    txRecente(0, 10, 15, 'despesa', 'Mercado São Luiz', 58.9, 'Alimentação', 'Conta principal');
    txRecente(0, 8, 30, 'despesa', 'Assinatura streaming', 29.99, 'Lazer', 'Cartão de crédito');
    txRecente(1, 18, 0, 'receita', 'Salário', 1250, 'Receita', 'Conta principal');
    txRecente(1, 12, 30, 'despesa', 'Posto de gasolina', 45, 'Transporte', 'Cartão de crédito');
    txRecente(1, 9, 10, 'despesa', 'Farmácia Nova Vida', 32.5, 'Saúde', 'Conta principal');
    txRecente(2, 16, 20, 'receita', 'Freelance design', 480, 'Receita', 'Conta principal');
    txRecente(3, 8, 0, 'despesa', 'Aluguel', 1200, 'Moradia', 'Conta principal');
    txRecente(4, 20, 45, 'despesa', 'iFood', 42.3, 'Alimentação', 'Cartão de crédito');

    txMes(5, 9, 0, 'receita', 'Pagamento mensal', 6800, 'Salário');
    txMes(15, 16, 20, 'receita', 'Freelance site institucional', 590, 'Freelance');

    txMes(5, 8, 5, 'despesa', 'Condomínio', 300, 'Moradia');

    txMes(8, 19, 10, 'despesa', 'Supermercado Extra', 556.8, 'Alimentação');
    txMes(17, 7, 50, 'despesa', 'Padaria Pão Quente', 42, 'Alimentação');
    txMes(19, 13, 0, 'despesa', 'Restaurante Japonês', 280, 'Alimentação');

    txMes(10, 21, 0, 'despesa', 'Show no Ibirapuera', 450, 'Lazer');
    txMes(14, 19, 30, 'despesa', 'Cinema', 96, 'Lazer');
    txMes(18, 22, 15, 'despesa', 'Bar com amigos', 144.01, 'Lazer');

    txMes(3, 8, 10, 'despesa', 'Combustível', 290, 'Transporte');
    txMes(9, 23, 40, 'despesa', 'Uber', 85, 'Transporte');
    txMes(16, 12, 0, 'despesa', 'Estacionamento mensal', 200, 'Transporte');

    txMes(2, 7, 0, 'despesa', 'Academia', 250, 'Saúde');
    txMes(11, 17, 25, 'despesa', 'Consulta médica', 127.5, 'Saúde');
    txMes(7, 20, 0, 'despesa', 'Curso online', 300, 'Educação');
    txMes(13, 15, 35, 'despesa', 'Livraria', 150, 'Compras');

    // "Conta" não existe no backend: o front guarda em localStorage (js/contas.js).
    lsSet('nexum-tx-contas', JSON.stringify(contas));

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

    // ---- Metas (Figma: tela Metas). Prazo em meses a partir do mês atual. ----
    // O ícone da meta não existe no backend: o front guarda em localStorage (U.iconeMeta).
    var icones = {};
    function meta(descricao, alvo, atual, aporte, mesesPrazo, icone) {
      icones[db.seq.meta + 1] = icone;
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
    // ritmo = ceil(faltam / aporte): 3, 2, 4, 28, 6 e 18 meses
    meta('Viagem para Bali', 5000, 3450, 600, 1, 'viagem');            // 69%
    meta('Reserva de emergência', 3000, 2200, 500, 0, 'reserva');      // 73%
    meta('Notebook novo', 1800, 850, 250, 2, 'consumo');               // 47%
    meta('Entrada do apartamento', 40000, 12000, 1000, 19, 'imovel'); // 30%
    meta('Curso de especialização', 2500, 600, 320, 4, 'estudo');     // 24%
    meta('Troca de carro', 25000, 8000, 950, 10, 'veiculo');          // 32%
    lsSet('nexum-meta-icones', JSON.stringify(icones));

    return db;
  }

  var db;
  function load() {
    var raw = lsGet(DB_KEY);
    if (raw) { try { db = JSON.parse(raw); if (db.version === VERSION) return; } catch (e) {} }
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
    // Igual à API Java: 0 a 100, arredondado para baixo.
    var alvo = Number(m.valor_alvo);
    o.percentual = alvo > 0 ? Math.max(0, Math.min(100, Math.floor(Number(m.valor_atual) / alvo * 100))) : 0;
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
      if (!body.email || !body.senha) erro('E-mail ou senha inválidos');
      // Token falso: só para o front ter o que salvar ('nexum_token'). O mock não confere.
      return { token: 'mock-token.' + Date.now(), usuario: clone(db.usuario) };
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
      // Igual à API Java: economias = receitas - despesas do mês; saldo = acumulado até o fim do mês.
      var saldo = 0;
      db.transacoes.forEach(function (t) {
        if (new Date(t.data) <= r.fim) saldo += t.tipo === 'receita' ? Number(t.valor) : -Number(t.valor);
      });
      return {
        mes: r.inicio.getMonth() + 1, ano: r.inicio.getFullYear(),
        receitas: receitas, despesas: despesas, economias: receitas - despesas, saldo: saldo
      };
    }
    if (method === 'GET' && path === '/transacoes/relatorio') {
      // Totais por mês (do mais antigo ao atual) e despesas por categoria, como a API Java.
      var nMeses = Number(query.meses) || 6;
      var hojeR = new Date();
      var ultimoR = query.mes
        ? new Date(Number(query.ano) || hojeR.getFullYear(), Number(query.mes) - 1, 1)
        : new Date(hojeR.getFullYear(), hojeR.getMonth(), 1);
      var baldes = [];
      for (var bi = nMeses - 1; bi >= 0; bi--) {
        var ref = new Date(ultimoR.getFullYear(), ultimoR.getMonth() - bi, 1);
        baldes.push({ mes: ref.getMonth() + 1, ano: ref.getFullYear(), receitas: 0, despesas: 0, economias: 0 });
      }
      var porCat = {}, totRec = 0, totDesp = 0;
      db.transacoes.forEach(function (t) {
        var d = new Date(t.data);
        var b = baldes.filter(function (x) { return x.ano === d.getFullYear() && x.mes === d.getMonth() + 1; })[0];
        if (!b) return;
        var v = Number(t.valor);
        if (t.tipo === 'receita') { b.receitas += v; totRec += v; return; }
        b.despesas += v;
        totDesp += v;
        var c = findCategoria(t.categoria_id);
        var k = c ? c.id : 'sem';
        porCat[k] = porCat[k] || { categoria_id: c ? c.id : null, nome: c ? c.nome : 'Sem categoria', icone: c ? c.icone : null, total: 0 };
        porCat[k].total += v;
      });
      baldes.forEach(function (b) { b.economias = b.receitas - b.despesas; });
      return {
        meses: nMeses, total_receitas: totRec, total_despesas: totDesp, economias: totRec - totDesp,
        por_mes: baldes,
        por_categoria: Object.keys(porCat).map(function (k) {
          var x = porCat[k];
          x.percentual = totDesp ? Math.round(x.total / totDesp * 1000) / 10 : 0;
          return x;
        }).sort(function (a, b) { return b.total - a.total; })
      };
    }
    if (method === 'GET' && path === '/transacoes') {
      var lista = db.transacoes.slice();
      if (query.mes && query.ano) {
        var ri = intervaloMes(Number(query.mes), Number(query.ano));
        lista = lista.filter(function (t) { return noIntervalo(t.data, ri); });
      }
      if (query.tipo) lista = lista.filter(function (t) { return t.tipo === query.tipo; });
      if (query.categoria_id) lista = lista.filter(function (t) { return t.categoria_id === parseInt(query.categoria_id, 10); });
      if (query.categoria) lista = lista.filter(function (t) {
        var c = findCategoria(t.categoria_id);
        return c && (String(c.id) === query.categoria || c.nome.toLowerCase() === query.categoria.toLowerCase());
      });
      if (query.conta) lista = lista.filter(function (t) { return (t.conta || '').toLowerCase() === query.conta.toLowerCase(); });
      if (query.busca) lista = lista.filter(function (t) { return (t.descricao || '').toLowerCase().indexOf(query.busca.toLowerCase()) !== -1; });
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
        conta: body.conta || null,
        criado_em: new Date().toISOString()
      };
      db.transacoes.push(nova);
      save();
      return outTransacao(nova, false);
    }
    if ((m = path.match(/^\/transacoes\/(\d+)$/))) {
      var it = porId(db.transacoes, 'id_transacao', parseInt(m[1], 10));
      if (it === -1) erro('Transação não encontrada.');
      if (method === 'GET') return outTransacao(db.transacoes[it], true);
      if (method === 'PUT') {
        var t = db.transacoes[it];
        aplicar(t, body, ['tipo', 'descricao', 'valor', 'data', 'categoria_id']);
        if (body.conta != null) t.conta = body.conta || null; // sem "conta": mantém (igual à API)
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
        status_meta: 'em_andamento',
        icone: body.icone || null
      };
      db.metas.push(meta);
      save();
      return outMeta(meta);
    }
    if ((m = path.match(/^\/metas\/(\d+)$/))) {
      var im = porId(db.metas, 'id_meta', parseInt(m[1], 10));
      if (im === -1) erro('Meta não encontrada.');
      if (method === 'GET') return outMeta(db.metas[im]);
      if (method === 'PUT') {
        var mt = db.metas[im];
        aplicar(mt, body, ['descricao', 'valor_alvo', 'valor_atual', 'aporte_mensal', 'data_inicio', 'data_prazo', 'status_meta']);
        if (body.icone != null) mt.icone = body.icone || null; // "" remove; sem "icone" mantém (igual à API)
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

  // ===================== SELO "MOCK" / "Versão de teste" =====================
  function badge() {
    if (document.querySelector('.mock-badge')) return;
    var el = document.createElement('div');
    el.className = 'mock-badge';
    el.textContent = deploy ? 'Versão de teste' : 'MOCK';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  if (document.body) badge();
  else document.addEventListener('DOMContentLoaded', badge);
})();
