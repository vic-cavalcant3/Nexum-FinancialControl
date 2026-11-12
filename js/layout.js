// Estrutura compartilhada das telas internas.
// Depende de: js/api.js, js/theme.js, js/icons.js.
// Uso (no fim do <body>): renderLayout('dashboard');

(function () {
  var MENU = [
    { id: 'dashboard', href: 'dashboard.html', label: 'Visão geral', icon: 'home' },
    { id: 'transacoes', href: 'transacoes.html', label: 'Transações', icon: 'transacoes' },
    { id: 'planejamento', href: 'planejamento.html', label: 'Planejamento', icon: 'planejamento' },
    { id: 'metas', href: 'metas.html', label: 'Metas', icon: 'metas' }
  ];

  var FERRAMENTAS = [
    { id: 'relatorios', href: 'relatorios.html', label: 'Relatórios', icon: 'relatorios' },
    { id: 'consultor', href: 'consultor.html', label: 'Consultor IA', icon: 'consultor' },
    { id: 'dicas', href: 'dicas.html', label: 'Dicas', icon: 'dicas' },
    { id: 'configuracoes', href: 'configuracoes.html', label: 'Configurações', icon: 'config' }
  ];

  var TABS = [
    { id: 'dashboard', href: 'dashboard.html', label: 'Início', icon: 'home-m' },
    { id: 'transacoes', href: 'transacoes.html', label: 'Transações', icon: 'transacoes-m' },
    { id: 'metas', href: 'metas.html', label: 'Metas', icon: 'metas-m' },
    { id: 'relatorios', href: 'relatorios.html', label: 'Relatórios', icon: 'relatorios-m' }
  ];

  var MAIS = [
    { id: 'planejamento', href: 'planejamento.html', label: 'Planejamento', icon: 'planejamento' },
    { id: 'consultor', href: 'consultor.html', label: 'Consultor IA', icon: 'consultor' },
    { id: 'configuracoes', href: 'configuracoes.html', label: 'Config.', icon: 'config' },
    { id: 'dicas', href: 'dicas.html', label: 'Dicas', icon: 'dicas' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function sbItems(list, active) {
    return list.map(function (it) {
      var on = it.id === active;
      return '<li><a class="sb-item' + (on ? ' is-active' : '') + '" href="' + it.href + '"' +
        (on ? ' aria-current="page"' : '') + '>' + ICONS[it.icon] + '<span>' + it.label + '</span></a></li>';
    }).join('');
  }

  function sidebarHTML(active) {
    var u = (typeof getUsuario === 'function' && getUsuario()) || {};
    return '' +
      '<aside class="sidebar" aria-label="Navegação principal">' +
        '<a class="sb-brand" href="dashboard.html"><img src="../assets/logo/logo-48.svg" width="32" height="32" alt=""><span>Nexum</span></a>' +
        '<label class="sb-search">' + ICONS.search +
          '<span class="sr-only">Buscar</span><input type="search" placeholder="Buscar..."></label>' +
        '<p class="sb-section">MENU</p>' +
        '<ul class="sb-list">' + sbItems(MENU, active) + '</ul>' +
        '<p class="sb-section">FERRAMENTAS</p>' +
        '<ul class="sb-list">' + sbItems(FERRAMENTAS, active) + '</ul>' +
        '<div class="sb-spacer"></div>' +
        '<div class="theme-toggle" role="group" aria-label="Tema">' +
          '<span class="theme-toggle-pill" aria-hidden="true"></span>' +
          '<button type="button" data-set-theme="light">' + ICONS.sun + '<span>Claro</span></button>' +
          '<button type="button" data-set-theme="dark">' + ICONS.moon + '<span>Escuro</span></button>' +
        '</div>' +
        '<div class="sb-divider"></div>' +
        '<div class="sb-profile">' +
          '<span class="sb-avatar" aria-hidden="true"></span>' +
          '<div class="sb-user">' +
            '<span class="sb-user-name" title="' + esc(u.nome) + '">' + esc(u.nome) + '</span>' +
            '<span class="sb-user-email" title="' + esc(u.email) + '">' + esc(u.email) + '</span>' +
          '</div>' +
          '<button class="sb-logout" type="button" aria-label="Sair">' + ICONS.logout + '</button>' +
        '</div>' +
      '</aside>';
  }

  function mobileNavHTML(active) {
    var tabs = TABS.map(function (t) {
      var on = t.id === active;
      return '<a class="mnav-tab' + (on ? ' is-active' : '') + '" href="' + t.href + '"' +
        (on ? ' aria-current="page"' : '') + ' aria-label="' + t.label + '">' +
        ICONS[t.icon] + '<span class="mnav-label" aria-hidden="true">' + t.label + '</span></a>';
    }).join('');

    var mais = MAIS.map(function (m) {
      return '<a class="mnav-bubble-item" href="' + m.href + '"' + (m.id === active ? ' aria-current="page"' : '') + '>' +
        '<span class="mnav-tile">' + ICONS[m.icon] + '</span><span>' + m.label + '</span></a>';
    }).join('');

    return '' +
      '<div class="mnav-backdrop" hidden></div>' +
      '<nav class="mnav-bubble" id="mnav-bubble" aria-label="Mais opções" hidden>' + mais + '</nav>' +
      '<nav class="mnav" aria-label="Navegação">' +
        '<div class="mnav-pill">' + tabs + '</div>' +
        '<button class="mnav-more" type="button" aria-label="Mais" aria-expanded="false" aria-controls="mnav-bubble">' + ICONS.plus + '</button>' +
      '</nav>';
  }

  function bindThemeToggle(root) {
    var toggle = root.querySelector('.theme-toggle');
    function sync() {
      var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      toggle.setAttribute('data-active', t);
      toggle.querySelectorAll('[data-set-theme]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-set-theme') === t));
      });
    }
    toggle.addEventListener('click', function (e) {
      var b = e.target.closest('[data-set-theme]');
      if (b) setTheme(b.getAttribute('data-set-theme'));
    });
    document.addEventListener('themechange', sync);
    sync();
  }

  function bindMobileNav() {
    var btn = document.querySelector('.mnav-more');
    var bubble = document.getElementById('mnav-bubble');
    var backdrop = document.querySelector('.mnav-backdrop');

    function setOpen(open) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Fechar' : 'Mais');
      bubble.hidden = !open;
      backdrop.hidden = !open;
    }

    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });
    backdrop.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !bubble.hidden) { setOpen(false); btn.focus(); }
    });
  }

  window.renderLayout = function (activePage) {
    redirecionarSeNaoLogado();

    var wrap = document.createElement('div');
    wrap.innerHTML = sidebarHTML(activePage);
    var sidebar = wrap.firstChild;
    document.body.insertBefore(sidebar, document.body.firstChild);
    bindThemeToggle(sidebar);

    sidebar.querySelector('.sb-logout').addEventListener('click', function () {
      limparSessao();
      window.location.href = 'login.html';
    });

    document.body.insertAdjacentHTML('beforeend', mobileNavHTML(activePage));
    bindMobileNav();
  };
})();
