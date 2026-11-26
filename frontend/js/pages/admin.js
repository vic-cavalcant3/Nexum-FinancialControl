// Painel do administrador. Depende de js/api.js (Auth, Admin), js/util.js (U),
// js/icons.js, js/modal.js e js/toast.js.
// Acesso só pela URL. Quem não é ADMIN volta para a dashboard (o servidor confirma com 403).
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var TAMANHO = 20;
  var DEBOUNCE_MS = 300;

  var fmtNum = new Intl.NumberFormat('pt-BR');
  var fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  var fmtDataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  var fmtRel = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  var fmtMesAno = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

  var eu = getUsuario() || {};
  var estado = { busca: '', pagina: 0, req: 0, usuarios: [] };

  // ---------- Ícones ----------
  $('adm-sair').innerHTML = ICONS.logout;
  document.querySelector('.adm-search-ic').innerHTML = ICONS.search;
  document.querySelectorAll('.modal-close').forEach(function (b) { b.innerHTML = ICONS.close; });

  // ---------- Formatação ----------
  // "16/11/2026"
  function data(iso) { return iso ? fmtData.format(new Date(iso)) : '—'; }

  // "agora há pouco", "há 5 minutos", "há 3 horas", "ontem", "há 3 dias", "há 2 meses"
  function relativo(iso) {
    if (!iso) return 'Nunca';
    var seg = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    var abs = Math.abs(seg);
    if (abs < 60) return 'agora há pouco';
    if (abs < 3600) return fmtRel.format(Math.round(seg / 60), 'minute');
    if (abs < 86400) return fmtRel.format(Math.round(seg / 3600), 'hour');
    if (abs < 86400 * 30) return fmtRel.format(Math.round(seg / 86400), 'day');
    if (abs < 86400 * 365) return fmtRel.format(Math.round(seg / (86400 * 30)), 'month');
    return fmtRel.format(Math.round(seg / (86400 * 365)), 'year');
  }

  function skel(w, h) { return '<span class="skel" style="width:' + w + 'px;height:' + h + 'px"></span>'; }

  // ---------- Erros ----------
  // 403: a pessoa não é (mais) admin.
  function semPermissao(err) {
    return /restrito a administradores/i.test((err && err.message) || '');
  }
  function irParaApp() { window.location.replace('dashboard.html'); }

  // ---------- Estatísticas ----------
  function statsCarregando() {
    $('adm-stats-erro').hidden = true;
    document.querySelectorAll('[data-stat]').forEach(function (el) { el.innerHTML = skel(70, 20); });
    var alturas = [0.3, 0.5, 0.4, 0.7, 0.45, 0.6, 0.8, 0.5, 0.65, 0.9, 0.55, 0.75];
    $('adm-flow').innerHTML = alturas.map(function (a) {
      return '<div class="flow-col"><span class="flow-bar skel" style="height:calc(var(--bar-max) * ' + a + ')"></span>' +
        '<span class="flow-month">' + skel(18, 10) + '</span></div>';
    }).join('');
  }

  function statsErro() {
    $('adm-stats-erro').hidden = false;
    document.querySelectorAll('[data-stat]').forEach(function (el) { el.textContent = '—'; });
    $('adm-flow').querySelectorAll('.skel').forEach(function (s) { s.style.animation = 'none'; });
  }

  function renderStats(s) {
    document.querySelectorAll('[data-stat]').forEach(function (el) {
      el.textContent = fmtNum.format(U.num(s[el.getAttribute('data-stat')]));
    });
    var meses = s.cadastros_por_mes || [];
    var max = Math.max.apply(null, meses.map(function (m) { return U.num(m.total); }).concat([0]));
    $('adm-flow').innerHTML = meses.map(function (m) {
      var ref = new Date(m.ano, m.mes - 1, 1);
      var total = U.num(m.total);
      var frac = max > 0 ? total / max : 0;
      var texto = total === 1 ? '1 cadastro' : fmtNum.format(total) + ' cadastros';
      var nomeMes = fmtMesAno.format(ref);
      return '<div class="flow-col">' +
        '<button type="button" class="flow-bar" style="height:max(4px, calc(var(--bar-max) * ' + frac.toFixed(4) + '))"' +
        ' aria-label="' + U.esc(nomeMes + ': ' + texto) + '" data-valor="' + U.esc(texto) + '"></button>' +
        '<span class="flow-month">' + U.esc(U.mesAbrev(ref)) + '</span></div>';
    }).join('');
  }

  async function carregarStats() {
    statsCarregando();
    try {
      renderStats(await Admin.estatisticas());
    } catch (err) {
      if (semPermissao(err)) return irParaApp();
      console.error(err);
      statsErro();
    }
  }

  // Tocar na barra mostra quantos cadastros (um por vez), igual à dashboard.
  $('adm-flow').addEventListener('click', function (e) {
    var bar = e.target.closest('button.flow-bar');
    var aberto = this.querySelector('.flow-tip');
    var mesmo = aberto && bar && aberto.parentNode === bar.parentNode;
    if (aberto) aberto.remove();
    if (!bar || mesmo) return;
    var tip = document.createElement('span');
    tip.className = 'flow-tip';
    tip.textContent = bar.getAttribute('data-valor');
    bar.parentNode.appendChild(tip);
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#adm-flow')) {
      var t = document.querySelector('#adm-flow .flow-tip');
      if (t) t.remove();
    }
  });

  // ---------- Usuários ----------
  function podeExcluir(u) { return u.papel !== 'ADMIN' && u.id_usuario !== eu.id_usuario; }

  function motivoBloqueio(u) {
    if (u.id_usuario === eu.id_usuario) return 'Você não pode excluir a sua própria conta';
    if (u.papel === 'ADMIN') return 'Administradores não podem ser excluídos';
    return '';
  }

  function botaoExcluir(u) {
    var pode = podeExcluir(u);
    var rotulo = pode ? 'Excluir ' + u.nome : motivoBloqueio(u);
    return '<button type="button" class="adm-del" data-excluir="' + u.id_usuario + '"' +
      ' aria-label="' + U.esc(rotulo) + '" title="' + U.esc(pode ? 'Excluir usuário' : rotulo) + '"' +
      (pode ? '' : ' disabled') + '>' + ICONS.trash + '</button>';
  }

  function tag(u) {
    var admin = u.papel === 'ADMIN';
    return '<span class="adm-tag' + (admin ? '' : ' is-user') + '">' + (admin ? 'Admin' : 'Usuário') + '</span>';
  }

  function voce(u) { return u.id_usuario === eu.id_usuario ? '<span class="adm-you">(você)</span>' : ''; }

  function acesso(u) {
    return '<span title="' + U.esc(u.ultimo_acesso ? fmtDataHora.format(new Date(u.ultimo_acesso)) : 'Nunca entrou') + '">' +
      U.esc(relativo(u.ultimo_acesso)) + '</span>';
  }

  function linhaTabela(u) {
    return '<tr>' +
      '<td><div class="adm-user">' +
        '<span class="adm-user-name"><span>' + U.esc(u.nome) + '</span>' + voce(u) + '</span>' +
        '<span class="adm-user-email">' + U.esc(u.email) + '</span>' +
      '</div></td>' +
      '<td>' + tag(u) + '</td>' +
      '<td>' + U.esc(data(u.criado_em)) + '</td>' +
      '<td>' + acesso(u) + '</td>' +
      '<td class="is-num">' + fmtNum.format(U.num(u.qtd_transacoes)) + '</td>' +
      '<td class="is-num">' + fmtNum.format(U.num(u.qtd_metas)) + '</td>' +
      '<td>' + botaoExcluir(u) + '</td>' +
    '</tr>';
  }

  function cardMobile(u) {
    return '<li class="adm-card">' +
      '<div class="adm-card-head">' +
        '<div class="adm-user">' +
          '<span class="adm-user-name"><span>' + U.esc(u.nome) + '</span>' + tag(u) + voce(u) + '</span>' +
          '<span class="adm-user-email">' + U.esc(u.email) + '</span>' +
        '</div>' + botaoExcluir(u) +
      '</div>' +
      '<dl class="adm-card-meta">' +
        '<div><dt>Cadastro</dt><dd>' + U.esc(data(u.criado_em)) + '</dd></div>' +
        '<div><dt>Último acesso</dt><dd>' + acesso(u) + '</dd></div>' +
        '<div><dt>Transações</dt><dd>' + fmtNum.format(U.num(u.qtd_transacoes)) + '</dd></div>' +
        '<div><dt>Metas</dt><dd>' + fmtNum.format(U.num(u.qtd_metas)) + '</dd></div>' +
      '</dl>' +
    '</li>';
  }

  function listaCarregando() {
    $('adm-lista-erro').hidden = true;
    $('adm-vazio').hidden = true;
    $('adm-pager').hidden = true;
    var linhas = '', cards = '';
    for (var i = 0; i < 5; i++) {
      linhas += '<tr><td><div class="adm-user">' + skel(140, 13) + skel(180, 11) + '</div></td>' +
        '<td>' + skel(52, 18) + '</td><td>' + skel(72, 13) + '</td><td>' + skel(72, 13) + '</td>' +
        '<td class="is-num">' + skel(24, 13) + '</td><td class="is-num">' + skel(16, 13) + '</td><td></td></tr>';
      cards += '<li class="adm-card"><div class="adm-user">' + skel(140, 13) + skel(180, 11) + '</div>' +
        '<div class="adm-card-meta">' + skel(90, 24) + skel(90, 24) + '</div></li>';
    }
    $('adm-tbody').innerHTML = linhas;
    $('adm-cards').innerHTML = cards;
    if (!$('adm-count').textContent) $('adm-count').innerHTML = skel(60, 12);
  }

  function listaErro() {
    $('adm-tbody').innerHTML = '';
    $('adm-cards').innerHTML = '';
    $('adm-count').textContent = '';
    $('adm-lista-erro').hidden = false;
  }

  function renderLista(r) {
    estado.usuarios = r.usuarios || [];
    var total = U.num(r.total), paginas = U.num(r.total_paginas);

    $('adm-count').textContent = total === 1 ? '1 usuário' : fmtNum.format(total) + ' usuários';
    $('adm-tbody').innerHTML = estado.usuarios.map(linhaTabela).join('');
    $('adm-cards').innerHTML = estado.usuarios.map(cardMobile).join('');

    var vazio = !estado.usuarios.length;
    $('adm-vazio').hidden = !vazio;
    if (vazio) {
      $('adm-vazio').textContent = estado.busca
        ? 'Nenhum usuário encontrado para "' + estado.busca + '".'
        : 'Nenhum usuário cadastrado ainda.';
    }

    $('adm-pager').hidden = paginas <= 1;
    $('adm-pager-info').textContent = 'Página ' + (estado.pagina + 1) + ' de ' + Math.max(1, paginas);
    $('adm-prev').disabled = estado.pagina <= 0;
    $('adm-next').disabled = estado.pagina >= paginas - 1;
  }

  async function carregarLista() {
    var req = ++estado.req;   // respostas atrasadas de uma busca antiga são ignoradas
    listaCarregando();
    try {
      var r = await Admin.listarUsuarios({ busca: estado.busca, pagina: estado.pagina, tamanho: TAMANHO });
      if (req !== estado.req) return;
      // Página que sumiu (ex.: excluiu o último da última página): volta uma.
      if (!(r.usuarios || []).length && estado.pagina > 0 && estado.pagina >= U.num(r.total_paginas)) {
        estado.pagina = Math.max(0, U.num(r.total_paginas) - 1);
        return carregarLista();
      }
      renderLista(r);
    } catch (err) {
      if (req !== estado.req) return;
      if (semPermissao(err)) return irParaApp();
      console.error(err);
      listaErro();
    }
  }

  // Busca com debounce de 300 ms
  var timerBusca = null;
  $('adm-busca').addEventListener('input', function (e) {
    clearTimeout(timerBusca);
    var valor = e.target.value.trim();
    timerBusca = setTimeout(function () {
      if (valor === estado.busca) return;
      estado.busca = valor;
      estado.pagina = 0;
      carregarLista();
    }, DEBOUNCE_MS);
  });

  $('adm-prev').addEventListener('click', function () {
    if (estado.pagina > 0) { estado.pagina--; carregarLista(); }
  });
  $('adm-next').addEventListener('click', function () { estado.pagina++; carregarLista(); });

  $('adm-stats-retry').addEventListener('click', carregarStats);
  $('adm-lista-retry').addEventListener('click', carregarLista);

  // ---------- Excluir ----------
  var modal = $('modal-excluir-usuario');
  var alvo = null;

  function erroModal(msg) {
    $('mx-erro').textContent = msg || '';
    $('mx-erro').hidden = !msg;
  }

  function confere() {
    return alvo && $('mx-conf').value.trim().toLowerCase() === String(alvo.email).toLowerCase();
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-excluir]');
    if (!btn || btn.disabled) return;
    var id = Number(btn.getAttribute('data-excluir'));
    alvo = estado.usuarios.filter(function (u) { return u.id_usuario === id; })[0] || null;
    if (!alvo || !podeExcluir(alvo)) return;
    $('form-excluir-usuario').reset();
    $('mx-nome').textContent = alvo.nome;
    $('mx-email').textContent = alvo.email;
    $('mx-conf').placeholder = alvo.email;
    $('mx-ok').disabled = true;
    erroModal();
    Modal.open(modal);
  });

  $('mx-conf').addEventListener('input', function () {
    $('mx-ok').disabled = !confere();
    erroModal();
  });

  $('form-excluir-usuario').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!confere()) return;
    var btn = $('mx-ok');
    btn.disabled = true;
    btn.textContent = 'Excluindo...';
    try {
      await Admin.excluirUsuario(alvo.id_usuario);
      Modal.close(modal);
      showToast('Usuário excluído');
      carregarLista();
      carregarStats();
    } catch (err) {
      if (semPermissao(err)) return irParaApp();
      erroModal(U.erroMsg(err));
      btn.disabled = false;
    } finally {
      btn.textContent = 'Excluir usuário';
    }
  });

  // ---------- Sair ----------
  $('adm-sair').addEventListener('click', function () {
    limparSessao();
    window.location.href = 'login.html';
  });

  // ---------- Início: confirma o papel no servidor (sessões antigas não têm "papel" salvo) ----------
  async function iniciar() {
    statsCarregando();
    listaCarregando();
    try {
      var me = await Auth.me();
      salvarSessao(me);
      eu = me;
    } catch (err) {
      // 401 já foi para o login (api.js). Sem rede: segue com o que está salvo; as rotas /admin decidem.
      console.error(err);
    }
    if (eu.papel !== 'ADMIN') {
      if (eu.papel) return irParaApp();
    }
    carregarStats();
    carregarLista();
  }

  iniciar();
})();
