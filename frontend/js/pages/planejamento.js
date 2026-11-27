// Planejamento: limites por categoria x gastos do mês, tudo da API (Orcamentos + Categorias).
// Também cria, edita e exclui as categorias do usuário (modal "Nova categoria" e menu "⋯" do card).
// Depende de: js/api.js, js/util.js, js/modal.js, js/icons.js, js/toast.js.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var root = $('plp');

  // Textos das categorias padrão (a API não tem descrição para elas).
  var INFO = {
    'Moradia': { icon: 'cat-home', desc: 'Aluguel e contas fixas' },
    'Alimentação': { icon: 'cat-utensils', desc: 'Mercado e restaurantes' },
    'Transporte': { icon: 'cat-car', desc: 'Combustível e transporte' },
    'Lazer': { icon: 'cat-film', desc: 'Streaming e cinema' },
    'Saúde': { icon: 'cat-health', desc: 'Farmácia e consultas' },
    'Outros': { icon: 'cat-dots', desc: 'Despesas diversas' }
  };
  function info(nome) { return INFO[nome] || { icon: 'cat-dots', desc: '' }; }

  var NOME_MAX = 30, DESC_MAX = 60;

  // Mês da tela: sempre o atual.
  var hoje = new Date();
  var MES = hoje.getMonth() + 1, ANO = hoje.getFullYear();

  // plano.itens: categorias com limite no mês; plano.extras: categorias do usuário sem limite
  // (despesa ou receita), que também viram card; plano.livres: despesas sem limite (modal do orçamento).
  var plano = { itens: [], extras: [], livres: [], totalGasto: 0 };
  var categorias = [];   // GET /categorias (padrão + do usuário)
  var cards = [];        // o que está desenhado na grade, na ordem

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
  function catPorId(id) {
    for (var i = 0; i < categorias.length; i++) if (categorias[i].id === id) return categorias[i];
    return null;
  }
  function iconeDe(c) { return c.icone && CAT_ICONES[c.icone] ? iconeCategoria(c.icone) : ICONS[info(c.nome).icon]; }
  function descDe(c) { return c.descricao || (c.proprio ? '' : info(c.nome).desc); }

  // Junta o que vem do orçamento com os dados da categoria (descrição, ícone, se é do usuário).
  function enriquecer(item) {
    var c = catPorId(item.categoria_id) || {};
    item.tipo = c.tipo || item.tipo || 'despesa';
    item.icone = c.icone || item.icone || null;
    item.descricao = c.descricao || null;
    item.proprio = c.padrao === false;
    return item;
  }

  // Resposta da API -> plano da tela.
  function montarPlano(r) {
    var cats = r.categorias || [];
    var porNome = {};
    cats.forEach(function (c) { porNome[c.nome] = c; });

    var itens = cats.filter(function (c) { return c.limite != null; }).map(function (c) {
      return { categoria_id: c.categoria_id, nome: c.nome, icone: c.icone, limite: U.num(c.limite), gasto: U.num(c.gasto) };
    });
    if (!itens.length) {
      // Ainda não há orçamento salvo na API: parte do que estava no navegador (ou dos limites
      // do Figma). Vira orçamento de verdade no primeiro "Salvar alterações".
      itens = U.orcamento().map(function (o) {
        var c = porNome[o.nome];
        return c ? { categoria_id: c.categoria_id, nome: c.nome, icone: c.icone, limite: U.num(o.limite), gasto: U.num(c.gasto) } : null;
      }).filter(Boolean);
    }
    itens.forEach(enriquecer);

    var noPlano = {};
    itens.forEach(function (i) { noPlano[i.categoria_id] = true; });

    // Categorias criadas pelo usuário e sem limite também aparecem na grade.
    var gastoPorId = {};
    cats.forEach(function (c) { gastoPorId[c.categoria_id] = U.num(c.gasto); });
    var extras = categorias.filter(function (c) { return c.padrao === false && !noPlano[c.id]; }).map(function (c) {
      return enriquecer({ categoria_id: c.id, nome: c.nome, limite: null, gasto: gastoPorId[c.id] || 0 });
    });

    // Despesas fora do orçamento (categoria padrão sem limite ou sem categoria) contam em "Outros".
    var totalGasto = U.num(r.total_gasto);
    var somaCards = itens.concat(extras).reduce(function (s, i) { return s + (i.tipo === 'despesa' ? i.gasto : 0); }, 0);
    var outros = itens.filter(function (i) { return i.nome === 'Outros' && !i.proprio; })[0];
    if (outros && totalGasto - somaCards > 0) outros.gasto += totalGasto - somaCards;

    var livres = cats.filter(function (c) { return !noPlano[c.categoria_id]; })
      .map(function (c) { return { categoria_id: c.categoria_id, nome: c.nome }; });

    return { itens: itens, extras: extras, livres: livres, totalGasto: totalGasto };
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

  function cardHtml(c, i, novoId) {
    var desc = descDe(c);
    var classes = 'plc' + (c.proprio ? ' is-own' : '') + (novoId != null && c.categoria_id === novoId ? ' is-new' : '');
    var head = '<div class="plc-head"><span class="plc-tile" aria-hidden="true">' + iconeDe(c) + '</span>' +
      '<div class="plc-titles"><h2 class="plc-name">' + U.esc(c.nome) + '</h2>' +
      (desc ? '<p class="plc-desc only-d">' + U.esc(desc) + '</p>' : '') + '</div></div>';
    var mais = c.proprio
      ? '<button type="button" class="plc-more" data-menu-i="' + i + '" aria-haspopup="menu" aria-expanded="false" ' +
        'aria-label="Opções de ' + U.esc(c.nome) + '">' + ICONS.more + '</button>'
      : '';

    // Categoria de receita: não entra no orçamento.
    if (c.tipo === 'receita') {
      return '<article class="' + classes + '" data-i="' + i + '">' + mais + head +
        '<p class="plc-kind">Receita</p>' +
        '<p class="plc-limit plc-limit--muted">Fora do orçamento</p>' +
      '</article>';
    }

    var gasto = c.gasto || 0;
    var temLimite = c.limite != null;
    var limite = U.num(c.limite);
    var pct = limite > 0 ? Math.round(gasto / limite * 100) : (gasto > 0 ? 101 : 0);
    var estourado = temLimite && pct > 100;
    var cls = temLimite ? pctClasse(pct) : '';
    var fill = !temLimite ? 0 : limite > 0 ? Math.min(100, gasto / limite * 100) : (gasto > 0 ? 100 : 0);
    return '<article class="' + classes + '" data-i="' + i + '" data-estourado="' + estourado + '">' + mais + head +
      '<div class="plc-spent">' +
        '<span class="plc-spent-value"><span class="only-m">' + U.esc(U.moedaInt(gasto)) + '</span>' +
        '<span class="only-d">Gasto: ' + U.esc(U.moeda(gasto)) + '</span></span>' +
        (temLimite ? '<span class="plc-pct ' + cls + '">' + pct + '%</span>' : '') + '</div>' +
      '<div class="pbar" role="progressbar" aria-label="' + U.esc(c.nome) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(fill) + '">' +
        '<span class="pbar-fill ' + cls + '" style="width:' + fill.toFixed(2) + '%"></span></div>' +
      (temLimite
        ? '<p class="plc-limit"><span class="only-m">de ' + U.esc(U.moedaInt(limite)) + '</span>' +
          '<span class="only-d">Limite: ' + U.esc(U.moeda(limite)) + '</span></p>'
        : '<p class="plc-limit plc-limit--muted">Sem limite</p>') +
      '<button type="button" class="plc-edit only-d" data-editar-cat="' + c.categoria_id + '">' +
        (temLimite ? 'Editar Limite' : 'Definir Limite') + '</button>' +
    '</article>';
  }

  function render(novoId) {
    fecharMenu();
    var orc = plano.itens;
    var orcado = orc.reduce(function (s, c) { return s + U.num(c.limite); }, 0);
    var restante = orcado - plano.totalGasto;
    var fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    slot('orcado', U.moedaInt(orcado));
    slot('gasto', U.moedaInt(plano.totalGasto));
    slot('gasto-sub', (orcado > 0 ? Math.round(plano.totalGasto / orcado * 100) : 0) + '% do orçamento');
    slot('restante', moedaSinalInt(restante));
    slot('restante-sub', 'disponível até ' + p2(fim.getDate()) + '/' + p2(fim.getMonth() + 1));
    var elRest = root.querySelector('[data-slot="restante"]');
    elRest.classList.toggle('is-success', restante >= 0);
    elRest.classList.toggle('is-danger', restante < 0);

    // "Outros" (padrão) sempre por último, como no Figma; as do usuário entram antes dele.
    var ehOutros = function (c) { return c.nome === 'Outros' && !c.proprio; };
    cards = orc.filter(function (c) { return !ehOutros(c); })
      .concat(plano.extras)
      .concat(orc.filter(ehOutros));

    var estourados = [];
    var html = cards.map(function (c, i) {
      if (c.tipo !== 'receita' && c.limite != null) {
        var lim = U.num(c.limite);
        var p = lim > 0 ? Math.round((c.gasto || 0) / lim * 100) : ((c.gasto || 0) > 0 ? 101 : 0);
        if (p > 100) estourados.push(c.nome);
      }
      return cardHtml(c, i, novoId);
    }).join('');

    html += '<button type="button" class="plc-new" id="pl-nova"><span class="plc-new-ic" aria-hidden="true">' +
      ICONS['plus-md'] + '</span>Nova Categoria</button>';
    $('pl-cards').innerHTML = html;

    var warn = $('pl-warn');
    // Configurações → "Alertas de orçamento" desligado esconde o aviso.
    var alertasOn = U.store.get('nexum-prefs', {}).alertas !== false;
    warn.hidden = !estourados.length || !alertasOn;
    if (estourados.length) {
      var nomes = listaNomes(estourados);
      var plural = estourados.length > 1;
      warn.querySelector('.pl-warn-text').innerHTML =
        '<span class="only-m">' + U.esc(nomes + (plural ? ' passaram' : ' passou') + ' do limite.') + '</span>' +
        '<span class="only-d">' + U.esc('Atenção: ' + nomes + (plural ? ' ultrapassaram' : ' ultrapassou') + ' o limite este mês.') + '</span>';
    }

    var novo = novoId != null ? $('pl-cards').querySelector('.plc.is-new') : null;
    if (novo) {
      novo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(function () { novo.classList.remove('is-new'); }, 1200);
    }
  }

  // ---------- Dados ----------
  async function buscar() {
    var r = await Promise.all([
      Orcamentos.listar(MES, ANO),
      Categorias.listar().catch(function (e) { console.error(e); return categorias; })
    ]);
    categorias = r[1] || [];
    plano = montarPlano(r[0] || {});
  }

  async function carregar() {
    $('pl-alert').hidden = true;
    renderLoading();
    try {
      await buscar();
    } catch (err) {
      console.error(err);
      // Sem API: mostra os limites do navegador, sem gastos.
      plano = {
        itens: U.orcamento().map(function (o) { return { categoria_id: null, nome: o.nome, limite: U.num(o.limite), gasto: 0, tipo: 'despesa' }; }),
        extras: [],
        livres: [],
        totalGasto: 0
      };
      $('pl-alert').hidden = false;
    }
    render();
  }
  $('pl-retry').addEventListener('click', carregar);

  // Depois de criar/editar/excluir: busca de novo sem o esqueleto de carregamento.
  async function recarregar(novoId) {
    try {
      await buscar();
    } catch (err) {
      console.error(err);
      showToast(U.erroMsg(err));
    }
    render(novoId);
  }

  // Salva a lista inteira de limites do mês e redesenha com a resposta da API.
  async function salvar(itens) {
    var limites = itens.map(function (c) { return { categoria_id: c.categoria_id, limite: c.limite }; });
    if (limites.some(function (l) { return l.categoria_id == null; })) {
      throw new Error('Não foi possível carregar as categorias. Tente de novo.');
    }
    plano = montarPlano(await Orcamentos.atualizar(MES, ANO, limites) || {});
    render();
  }

  // ---------- VER DETALHES ----------
  $('pl-warn-link').addEventListener('click', function () {
    var els = root.querySelectorAll('.plc[data-estourado="true"]');
    if (!els.length) return;
    els[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    els.forEach(function (c) { c.classList.add('is-highlight'); });
    setTimeout(function () { els.forEach(function (c) { c.classList.remove('is-highlight'); }); }, 1600);
  });

  // ---------- Modal: editar orçamento ----------
  // Linhas: as categorias com limite e, depois, as de despesa ainda sem limite (em branco = continua sem).
  var modalOrc = $('modal-orc');
  var campos = $('orc-fields');
  var btnOrc = $('form-orc').querySelector('[type="submit"]');
  var linhasOrc = [];

  function abrirOrcamento(focoCategoriaId) {
    linhasOrc = plano.itens.map(function (c) { return { item: c, novo: false }; })
      .concat(plano.livres.map(function (c) { return { item: c, novo: true }; }));
    $('orc-erro').hidden = true;
    var focoIndex = null;
    campos.innerHTML = linhasOrc.map(function (l, i) {
      var c = l.item;
      if (focoCategoriaId != null && c.categoria_id === focoCategoriaId) focoIndex = i;
      return '<div class="orc-row"><label class="orc-label" for="orc-' + i + '">' + U.esc(c.nome) + '</label>' +
        '<span class="orc-input"><span aria-hidden="true">R$</span>' +
        '<input id="orc-' + i + '" type="text" inputmode="decimal" autocomplete="off" value="' +
        (l.novo ? '' : U.esc(String(U.num(c.limite)).replace('.', ','))) + '"' +
        (l.novo ? ' placeholder="—"' : '') + ' data-i="' + i + '"></span></div>';
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

  function sucesso() {
    showSuccess('Orçamento atualizado!', 'Os novos limites por categoria foram salvos.', null, { botao: 'Ver planejamento', compacto: true });
  }

  $('form-orc').addEventListener('submit', async function (e) {
    e.preventDefault();
    var erroEl = $('orc-erro');
    var invalido = null;
    var lista = [];
    Array.prototype.forEach.call(campos.querySelectorAll('input'), function (inp) {
      var linha = linhasOrc[Number(inp.getAttribute('data-i'))];
      var vazio = inp.value.trim() === '';
      if (vazio && linha.novo) { inp.parentNode.classList.remove('is-error'); return; }
      var v = vazio ? 0 : U.parseValor(inp.value);
      var ok = isFinite(v) && v >= 0;
      inp.parentNode.classList.toggle('is-error', !ok);
      if (!ok && !invalido) invalido = inp;
      lista.push({ categoria_id: linha.item.categoria_id, nome: linha.item.nome, limite: Math.round(v * 100) / 100 });
    });
    if (invalido) {
      erroEl.textContent = 'Informe valores válidos (R$ 0 ou mais).';
      erroEl.hidden = false;
      invalido.focus();
      return;
    }
    erroEl.hidden = true;
    btnOrc.disabled = true;
    try {
      await salvar(lista);
      Modal.close(modalOrc, true);
      sucesso();
    } catch (err) {
      erroEl.textContent = U.erroMsg(err);
      erroEl.hidden = false;
    } finally {
      btnOrc.disabled = false;
    }
  });

  // ---------- Menu "⋯" dos cards do usuário ----------
  var menu = document.createElement('div');
  menu.className = 'plc-menu';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  menu.innerHTML =
    '<button type="button" role="menuitem" data-acao="editar">Editar</button>' +
    '<button type="button" role="menuitem" data-acao="excluir" class="is-danger">Excluir</button>';
  var menuDe = null; // { botao, card: item de cards[] }

  function abrirMenu(botao) {
    fecharMenu();
    var item = cards[Number(botao.getAttribute('data-menu-i'))];
    if (!item) return;
    menuDe = { botao: botao, card: item };
    botao.parentNode.appendChild(menu);
    menu.hidden = false;
    botao.setAttribute('aria-expanded', 'true');
    menu.querySelector('button').focus();
  }

  function fecharMenu(devolverFoco) {
    if (!menuDe) return;
    menu.hidden = true;
    menuDe.botao.setAttribute('aria-expanded', 'false');
    if (devolverFoco && document.contains(menuDe.botao)) menuDe.botao.focus();
    menuDe = null;
  }

  menu.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acao]');
    if (!b || !menuDe) return;
    var cat = catPorId(menuDe.card.categoria_id);
    fecharMenu();
    if (!cat) return;
    if (b.getAttribute('data-acao') === 'editar') abrirCategoria(cat);
    else abrirExclusao(cat);
  });

  menu.addEventListener('keydown', function (e) {
    var itens = Array.prototype.slice.call(menu.querySelectorAll('button'));
    var i = itens.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      itens[(i + (e.key === 'ArrowDown' ? 1 : itens.length - 1)) % itens.length].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      fecharMenu(true);
    } else if (e.key === 'Tab') {
      fecharMenu();
    }
  });

  document.addEventListener('click', function (e) {
    if (menuDe && !menu.contains(e.target) && !menuDe.botao.contains(e.target)) fecharMenu();
  });

  $('pl-cards').addEventListener('click', function (e) {
    var mais = e.target.closest('.plc-more');
    if (mais) {
      if (menuDe && menuDe.botao === mais) fecharMenu(true);
      else abrirMenu(mais);
      return;
    }
    var ed = e.target.closest('[data-editar-cat]');
    if (ed) { abrirOrcamento(Number(ed.getAttribute('data-editar-cat'))); return; }
    if (e.target.closest('#pl-nova')) abrirCategoria(null);
  });

  // ---------- Modal: nova / editar categoria ----------
  var modalCat = $('modal-cat');
  var inNome = $('cat-nome'), inDesc = $('cat-desc'), inLim = $('cat-limite');
  var toggleTipo = $('cat-tipo'), gradeIcones = $('cat-icones');
  var btnCat = $('cat-salvar');
  var editando = null; // categoria em edição (null = criando)
  var tipoCat = 'despesa', iconeSel = 'dots';
  U.mascaraMoeda(inLim);

  gradeIcones.innerHTML = CAT_ICONES_ESCOLHA.map(function (o) {
    return '<button type="button" class="cat-icon" role="radio" aria-checked="false" tabindex="-1" ' +
      'data-icone="' + o.chave + '" aria-label="' + U.esc(o.nome) + '" title="' + U.esc(o.nome) + '">' +
      iconeCategoria(o.chave) + '</button>';
  }).join('');

  function setIcone(chave, focar) {
    iconeSel = chave;
    gradeIcones.querySelectorAll('.cat-icon').forEach(function (b) {
      var sel = b.getAttribute('data-icone') === chave;
      b.setAttribute('aria-checked', String(sel));
      b.tabIndex = sel ? 0 : -1;
      if (sel && focar) b.focus();
    });
  }

  gradeIcones.addEventListener('click', function (e) {
    var b = e.target.closest('.cat-icon');
    if (b) setIcone(b.getAttribute('data-icone'));
  });

  // Setas andam pela grade (radiogroup).
  gradeIcones.addEventListener('keydown', function (e) {
    var bts = Array.prototype.slice.call(gradeIcones.querySelectorAll('.cat-icon'));
    var i = bts.indexOf(document.activeElement);
    if (i === -1) return;
    var cols = getComputedStyle(gradeIcones).gridTemplateColumns.split(' ').length || 8;
    var passo = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (e.key === 'Home') passo = -i;
    if (e.key === 'End') passo = bts.length - 1 - i;
    if (passo == null) return;
    e.preventDefault();
    var j = Math.min(bts.length - 1, Math.max(0, i + passo));
    setIcone(bts[j].getAttribute('data-icone'), true);
  });

  function setTipo(tipo) {
    tipoCat = tipo;
    toggleTipo.setAttribute('data-value', tipo);
    toggleTipo.querySelectorAll('[data-tipo]').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-tipo') === tipo));
    });
    // O orçamento só aceita despesas.
    $('cat-limite-field').hidden = tipo !== 'despesa';
  }

  toggleTipo.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tipo]');
    if (b && !editando) setTipo(b.getAttribute('data-tipo'));
  });
  toggleTipo.addEventListener('keydown', function (e) {
    if (editando || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    setTipo(tipoCat === 'despesa' ? 'receita' : 'despesa');
    toggleTipo.querySelector('[aria-checked="true"]').focus();
  });

  function erroCampo(input, idErro, msg) {
    var el = $(idErro);
    el.textContent = msg || '';
    el.hidden = !msg;
    if (input) {
      input.classList.toggle('is-error', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
  }

  function limparErros() {
    erroCampo(inNome, 'cat-nome-erro', '');
    erroCampo(inDesc, 'cat-desc-erro', '');
    erroCampo(inLim, 'cat-limite-erro', '');
    $('cat-erro').hidden = true;
  }

  [[inNome, 'cat-nome-erro'], [inDesc, 'cat-desc-erro'], [inLim, 'cat-limite-erro']].forEach(function (par) {
    par[0].addEventListener('input', function () { if (par[0].classList.contains('is-error')) erroCampo(par[0], par[1], ''); });
  });

  // cat = categoria da API para editar; null para criar.
  function abrirCategoria(cat) {
    editando = cat;
    limparErros();
    var item = cat ? plano.itens.filter(function (i) { return i.categoria_id === cat.id; })[0] : null;
    $('modal-cat-title').textContent = cat ? 'Editar categoria' : 'Nova categoria';
    btnCat.textContent = cat ? 'Salvar alterações' : 'Criar categoria';
    inNome.value = cat ? cat.nome : '';
    inDesc.value = cat ? (cat.descricao || '') : '';
    inLim.value = item ? U.moeda(item.limite) : '';
    setTipo(cat ? cat.tipo : 'despesa');
    setIcone(cat && cat.icone && CAT_ICONES[cat.icone] ? cat.icone : 'dots');
    // O tipo não muda depois de criada (a API não aceita).
    toggleTipo.classList.toggle('is-locked', !!cat);
    toggleTipo.setAttribute('aria-disabled', cat ? 'true' : 'false');
    toggleTipo.querySelectorAll('button').forEach(function (b) { b.disabled = !!cat; });
    $('cat-tipo-hint').hidden = !cat;
    inNome.setAttribute('autofocus', '');
    Modal.open(modalCat);
  }

  // Limites do mês trocando (ou tirando, com limite null) o da categoria.
  function itensComLimite(categoriaId, nome, limite) {
    var orc = plano.itens.filter(function (c) { return c.categoria_id !== categoriaId; });
    if (limite == null) return orc;
    var atual = plano.itens.filter(function (c) { return c.categoria_id === categoriaId; })[0];
    var item = { categoria_id: categoriaId, nome: nome, limite: limite };
    if (atual) return plano.itens.map(function (c) { return c.categoria_id === categoriaId ? item : c; });
    // Entra antes de "Outros".
    var iOutros = -1;
    orc.forEach(function (c, i) { if (c.nome === 'Outros' && !c.proprio) iOutros = i; });
    if (iOutros === -1) orc.push(item); else orc.splice(iOutros, 0, item);
    return orc;
  }

  $('form-cat').addEventListener('submit', async function (e) {
    e.preventDefault();
    limparErros();
    var nome = inNome.value.trim();
    var descricao = inDesc.value.trim();
    var temLimite = tipoCat === 'despesa' && inLim.value.trim() !== '';
    var limite = temLimite ? U.parseValor(inLim.value) : null;

    var primeiro = null;
    if (!nome) { erroCampo(inNome, 'cat-nome-erro', 'Informe o nome da categoria.'); primeiro = primeiro || inNome; }
    else if (nome.length > NOME_MAX) { erroCampo(inNome, 'cat-nome-erro', 'O nome pode ter no máximo ' + NOME_MAX + ' caracteres.'); primeiro = primeiro || inNome; }
    if (descricao.length > DESC_MAX) { erroCampo(inDesc, 'cat-desc-erro', 'A descrição pode ter no máximo ' + DESC_MAX + ' caracteres.'); primeiro = primeiro || inDesc; }
    if (temLimite && !(limite > 0)) { erroCampo(inLim, 'cat-limite-erro', 'Informe um limite maior que zero ou deixe em branco.'); primeiro = primeiro || inLim; }
    if (primeiro) { primeiro.focus(); return; }
    if (temLimite) limite = Math.round(limite * 100) / 100;

    btnCat.disabled = true;
    var cat;
    try {
      cat = editando
        ? await Categorias.atualizar(editando.id, { nome: nome, descricao: descricao, icone: iconeSel })
        : await Categorias.criar({ nome: nome, tipo: tipoCat, icone: iconeSel, descricao: descricao });
    } catch (err) {
      var msg = U.erroMsg(err);
      // 409 de nome repetido vai para baixo do campo Nome.
      if (/nome/i.test(msg)) { erroCampo(inNome, 'cat-nome-erro', msg); inNome.focus(); }
      else { $('cat-erro').textContent = msg; $('cat-erro').hidden = false; }
      btnCat.disabled = false;
      return;
    }

    // Limite mensal: cria/atualiza (ou tira) o orçamento da categoria no mês atual.
    var limiteAntes = editando ? (plano.itens.filter(function (i) { return i.categoria_id === cat.id; })[0] || {}).limite : undefined;
    var mudouLimite = cat.tipo === 'despesa' && (editando ? (limiteAntes == null ? limite != null : limiteAntes !== limite) : limite != null);
    var falhaLimite = null;
    if (mudouLimite) {
      try {
        await Orcamentos.atualizar(MES, ANO, itensComLimite(cat.id, cat.nome, limite).map(function (c) {
          return { categoria_id: c.categoria_id, limite: c.limite };
        }));
      } catch (err2) {
        falhaLimite = err2;
      }
    }

    btnCat.disabled = false;
    Modal.close(modalCat, true);
    var criando = !editando;
    editando = null;
    await recarregar(criando ? cat.id : null);
    if (falhaLimite) showToast((criando ? 'Categoria criada' : 'Categoria atualizada') + ', mas o limite não foi salvo.', 3500);
    else showToast(criando ? 'Categoria criada!' : 'Categoria atualizada!');
  });

  // ---------- Modal: excluir categoria ----------
  var modalDel = $('modal-cat-del');
  var btnDel = $('cat-del-ok');
  var excluindo = null;

  function abrirExclusao(cat) {
    excluindo = cat;
    $('cat-del-texto').textContent = 'Tem certeza que deseja excluir a categoria "' + cat.nome + '"? ' +
      'O limite dela no orçamento também será removido. Essa ação não pode ser desfeita.';
    $('cat-del-erro').hidden = true;
    btnDel.disabled = false;
    Modal.open(modalDel);
  }

  btnDel.addEventListener('click', async function () {
    if (!excluindo) return;
    var erroEl = $('cat-del-erro');
    erroEl.hidden = true;
    btnDel.disabled = true;
    try {
      await Categorias.deletar(excluindo.id);
    } catch (err) {
      // 409: a categoria tem transações (mensagem do backend).
      erroEl.textContent = U.erroMsg(err);
      erroEl.hidden = false;
      btnDel.disabled = false;
      return;
    }
    Modal.close(modalDel, true);
    excluindo = null;
    await recarregar();
    showToast('Categoria excluída!');
  });

  carregar();
})();
