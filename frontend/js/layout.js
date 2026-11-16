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
    { id: 'planejamento', href: 'planejamento.html', label: 'Planejamento', short: 'Planej.', icon: 'planejamento' },
    { id: 'consultor', href: 'consultor.html', label: 'Consultor IA', short: 'Consultor', icon: 'consultor' },
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
    var atual = tabIndex(active);
    var tabs = TABS.map(function (t, i) {
      var on = i === atual;
      // Foco por teclado: só a aba atual (ou a primeira) entra no Tab; setas movem entre elas
      var foco = on || (atual < 0 && i === 0);
      return '<a class="mnav-tab' + (on ? ' is-on' : '') + '" role="tab" href="' + t.href + '" draggable="false"' +
        ' aria-selected="' + on + '" tabindex="' + (foco ? '0' : '-1') + '"' + (on ? ' aria-current="page"' : '') + '>' +
        ICONS[t.icon] + '<span class="mnav-label">' + t.label + '</span></a>';
    }).join('');

    var mais = MAIS.map(function (m) {
      return '<a class="mnav-bubble-item" href="' + m.href + '"' + (m.id === active ? ' aria-current="page"' : '') + '>' +
        '<span class="mnav-tile">' + ICONS[m.icon] + '</span>' +
        '<span class="mnav-bubble-label">' + (m.short
          ? '<span class="mnav-lbl-full">' + m.label + '</span><span class="mnav-lbl-short">' + m.short + '</span>'
          : m.label) + '</span></a>';
    }).join('');

    return '' +
      '<div class="mnav-backdrop" hidden></div>' +
      '<nav class="mnav-bubble" id="mnav-bubble" aria-label="Mais opções" hidden>' + mais + '</nav>' +
      '<nav class="mnav" aria-label="Navegação">' +
        '<div class="mnav-pill" role="tablist" aria-label="Navegação principal">' +
          '<span class="mnav-indicator" aria-hidden="true"><span class="mnav-indicator-blob"></span></span>' +
          tabs +
        '</div>' +
        '<button class="mnav-more" type="button" aria-label="Mais" aria-expanded="false" aria-controls="mnav-bubble">' + ICONS.plus + '</button>' +
      '</nav>';
  }

  function tabIndex(id) {
    for (var i = 0; i < TABS.length; i++) if (TABS[i].id === id) return i;
    return -1;
  }

  // ---------- Tab bar estilo iOS: bolha (indicador) que desliza e pode ser arrastada ----------
  // O indicador externo só faz translateX; o interno (blob) só faz scale. Nada de left/width animados.
  var NAV_PREV_KEY = 'nexum-nav-prev';
  var MOLA = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  function bindTabBar(activePage) {
    var pill = document.querySelector('.mnav-pill');
    var ind = pill.querySelector('.mnav-indicator');
    var blob = pill.querySelector('.mnav-indicator-blob');
    var tabs = [].slice.call(pill.querySelectorAll('.mnav-tab'));
    var reduz = window.matchMedia('(prefers-reduced-motion: reduce)');
    var atual = tabIndex(activePage);   // -1 quando a página não é uma das abas
    var naAba = atual;                  // aba onde o indicador está agora
    var x = 0;                          // translateX atual do indicador (px)
    var w = 0;                          // largura atual do indicador (px)
    var larguras = [];                  // largura do indicador em cada aba
    var navTimer = null;
    var p = null;                       // ponteiro em andamento

    function cel() { return pill.clientWidth / tabs.length; }
    function lerp(a, b, k) { return a + (b - a) * k; }
    function mola(normal) { return reduz.matches ? [150, 'ease-out'] : [normal || 420, MOLA]; }

    // Largura = conteúdo da aba (o maior entre ícone e label) + 14px de cada lado,
    // no mínimo a largura da aba - 4px e no máximo a barra menos as bordas internas (4px)
    function mede() {
      var c = cel();
      // 4px da borda externa em cima e embaixo, qualquer que seja a espessura usada da borda (0,5px ou 1px)
      var borda = parseFloat(getComputedStyle(pill).borderTopWidth) || 0;
      ind.style.top = ind.style.bottom = (4 - borda) + 'px';
      larguras = tabs.map(function (tab) {
        var ic = tab.querySelector('svg').getBoundingClientRect().width;
        var lb = tab.querySelector('.mnav-label');
        var conteudo = Math.max(ic, lb.getBoundingClientRect().width, lb.scrollWidth);
        return Math.min(pill.clientWidth - 8, Math.max(c - 4, conteudo + 28));
      });
    }

    // Centralizado no ponto, mas sem sair das bordas internas da barra
    function limita(esq, larg) { return Math.max(4, Math.min(pill.clientWidth - 4 - larg, esq)); }
    function posDaAba(i) { var l = larguras[i]; return [limita((i + 0.5) * cel() - l / 2, l), l]; }
    function abaNoCentro(cx) { return Math.max(0, Math.min(tabs.length - 1, Math.floor(cx / cel()))); }

    // Marca o indicador como "em movimento" só durante a animação (will-change temporário)
    var movTimer = null;
    function emMovimento(ms) {
      ind.classList.add('is-moving');
      clearTimeout(movTimer);
      movTimer = setTimeout(function () { ind.classList.remove('is-moving'); }, ms + 60);
    }

    function setPos(nx, nw, t) {
      if (t) emMovimento(t[0]);
      x = nx;
      w = nw;
      ind.style.transition = t ? 'transform ' + t[0] + 'ms ' + t[1] + ', width ' + t[0] + 'ms ' + t[1] : 'none';
      ind.style.width = nw + 'px';
      ind.style.transform = 'translateX(' + nx + 'px)';
    }

    function vaiPara(i, t) { var pos = posDaAba(i); setPos(pos[0], pos[1], t); }

    function setEscala(sx, sy, t) {
      if (t) emMovimento(t[0]);
      blob.style.transition = t ? 'transform ' + t[0] + 'ms ' + t[1] : 'none';
      blob.style.transform = 'scale(' + sx + ', ' + sy + ')';
    }

    // Cor ativa na aba que está sob a bolha
    function pinta(i) {
      tabs.forEach(function (tab, k) { tab.classList.toggle('is-on', k === i); });
    }

    function mostra(v) { ind.classList.toggle('is-hidden', !v); }

    function deslizaPara(i, t) {
      naAba = i;
      pinta(i);
      if (ind.classList.contains('is-hidden')) { vaiPara(i); mostra(true); return; }
      vaiPara(i, t);
    }

    function voltaPraAtual() {
      if (atual < 0) { mostra(false); pinta(-1); naAba = -1; return; }
      deslizaPara(atual, mola());
    }

    function navega(i) {
      if (i === atual) { deslizaPara(atual, mola()); return; }
      try { sessionStorage.setItem(NAV_PREV_KEY, String(atual)); } catch (e) {}
      deslizaPara(i, mola());
      clearTimeout(navTimer);
      navTimer = setTimeout(function () {
        window.location.href = tabs[i].getAttribute('href');
      }, reduz.matches ? 150 : 280);
    }

    // ----- Posição inicial: continua de onde a página anterior parou -----
    var anterior = -1;
    try {
      anterior = parseInt(sessionStorage.getItem(NAV_PREV_KEY), 10);
      sessionStorage.removeItem(NAV_PREV_KEY);
    } catch (e) {}
    mede();
    if (atual < 0) {
      mostra(false);
      pinta(-1);
    } else if (anterior >= 0 && anterior < tabs.length && anterior !== atual) {
      vaiPara(anterior);
      pinta(anterior);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { deslizaPara(atual, mola(380)); });
      });
    } else {
      vaiPara(atual);
    }

    // Remede quando a fonte carregar (muda a largura dos labels)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        mede();
        if ((p && p.arrastando) || naAba < 0) return;
        // Se a bolha estiver deslizando, só corrige o destino (mantém a animação em andamento)
        var pos = posDaAba(naAba);
        if (ind.style.transition && ind.style.transition !== 'none') {
          x = pos[0];
          w = pos[1];
          ind.style.width = w + 'px';
          ind.style.transform = 'translateX(' + x + 'px)';
        } else {
          setPos(pos[0], pos[1]);
        }
      });
    }

    // ----- Arrasto (Pointer Events) -----
    function iniciaArrasto() {
      if (!p || p.arrastando) return;
      p.arrastando = true;
      clearTimeout(p.segura);
      clearTimeout(navTimer);
      try { pill.setPointerCapture(p.id); } catch (e) {}
      pill.classList.add('is-dragging');
      if (ind.classList.contains('is-hidden')) { vaiPara(p.aba); mostra(true); }
      setPos(x, w);
      p.xIni = x;
      p.w = w;
      p.t0 = p.tAnt = performance.now();
      p.vel = 0;
      p.quente = naAba >= 0 ? naAba : p.aba;
      p.raf = requestAnimationFrame(quadro);
    }

    function quadro(agora) {
      if (!p || !p.arrastando) return;
      // Nos primeiros 160ms a bolha "levanta" e vai até o dedo; depois segue o dedo direto
      var k = reduz.matches ? 1 : Math.min(1, (agora - p.t0) / 160);
      var e = 1 - Math.pow(1 - k, 3);
      // A largura acompanha suavemente a da aba que está sob a bolha
      p.w = lerp(p.w, larguras[p.quente], 0.2);
      var alvo = limita(p.x - p.esq - p.w / 2, p.w);
      var nx = lerp(p.xIni, alvo, e);
      var dt = Math.max(1, agora - p.tAnt);
      p.vel = p.vel * 0.75 + ((nx - x) / dt) * 0.25;     // px/ms suavizado (cai a 0 quando o dedo para)
      p.tAnt = agora;
      setPos(nx, p.w);

      if (!reduz.matches) {
        var v = Math.min(1, Math.abs(p.vel) / 1.2);       // 1.2 px/ms = velocidade alta
        // "Levanta" (1.12 x 1.18) e estica com a velocidade, até 1.3 x 0.9 (vale também durante o levantar)
        setEscala(Math.min(1.3, lerp(1, 1.12, e) + 0.18 * v), Math.max(0.9, lerp(1, 1.18, e) - 0.28 * v));
      }

      var q = abaNoCentro(nx + p.w / 2);
      if (q !== p.quente) {
        p.quente = q;
        pinta(q);
        if (navigator.vibrate) { try { navigator.vibrate(6); } catch (err) {} }
      }
      p.raf = requestAnimationFrame(quadro);
    }

    function terminaArrasto(confirma) {
      cancelAnimationFrame(p.raf);
      pill.classList.remove('is-dragging');
      try { pill.releasePointerCapture(p.id); } catch (e) {}
      setEscala(1, 1, mola());                            // volta ao tamanho com um leve quique
      // Aba mais próxima de onde o dedo soltou (a bolha pode ainda estar a caminho dele)
      var alvo = abaNoCentro(Math.max(0, Math.min(pill.clientWidth, p.x - p.esq)));
      p = null;
      if (confirma) navega(alvo);
      else voltaPraAtual();
    }

    pill.addEventListener('pointerdown', function (e) {
      if (p || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var r = pill.getBoundingClientRect();
      p = { id: e.pointerId, x0: e.clientX, x: e.clientX, esq: r.left, arrastando: false };
      p.aba = abaNoCentro(e.clientX - r.left);
      p.segura = setTimeout(iniciaArrasto, 180);
    });

    pill.addEventListener('pointermove', function (e) {
      if (!p || e.pointerId !== p.id) return;
      p.x = e.clientX;
      if (!p.arrastando && Math.abs(p.x - p.x0) > 6) iniciaArrasto();
    });

    pill.addEventListener('pointerup', function (e) {
      if (!p || e.pointerId !== p.id) return;
      clearTimeout(p.segura);
      if (p.arrastando) { terminaArrasto(true); return; }
      var i = p.aba;
      p = null;
      navega(i);                                          // toque rápido
    });

    pill.addEventListener('pointercancel', function (e) {
      if (!p || e.pointerId !== p.id) return;
      clearTimeout(p.segura);
      if (p.arrastando) terminaArrasto(false);
      else p = null;
    });

    // O clique do link fica com o JS (animação antes de navegar). detail 0 = teclado/leitor de tela.
    pill.addEventListener('click', function (e) {
      var tab = e.target.closest('.mnav-tab');
      if (!tab) return;
      e.preventDefault();
      if (e.detail === 0) navega(tabs.indexOf(tab));
    });

    pill.addEventListener('dragstart', function (e) { e.preventDefault(); });
    pill.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // Teclado: setas/Home/End movem o foco; Enter/Espaço abrem a aba
    pill.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var n = tabs.length, j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % n;
      else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = n - 1;
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navega(i); return; }
      if (j === null) return;
      e.preventDefault();
      tabs[i].setAttribute('tabindex', '-1');
      tabs[j].setAttribute('tabindex', '0');
      tabs[j].focus();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && p && p.arrastando) terminaArrasto(false);
    });

    window.addEventListener('resize', function () {
      if (p && p.arrastando) return;
      mede();
      if (naAba >= 0) vaiPara(naAba);
    });

    // Voltar pelo histórico (bfcache): restaura a bolha na aba desta página
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      clearTimeout(navTimer);
      setEscala(1, 1);
      if (atual < 0) { mostra(false); pinta(-1); naAba = -1; }
      else { naAba = atual; pinta(atual); vaiPara(atual); }
    });
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

    var reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

    function isOpen() { return btn.getAttribute('aria-expanded') === 'true'; }

    function setOpen(open) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Fechar' : 'Mais');
      backdrop.hidden = !open;
      if (open) {
        bubble.classList.remove('is-closing');
        bubble.hidden = false;
      } else if (!bubble.hidden) {
        // Fecha com a animação inversa; com movimento reduzido, some na hora
        if (reduzMovimento.matches) bubble.hidden = true;
        else bubble.classList.add('is-closing');
      }
    }

    bubble.addEventListener('animationend', function (e) {
      if (e.target === bubble && bubble.classList.contains('is-closing')) {
        bubble.classList.remove('is-closing');
        bubble.hidden = true;
      }
    });

    btn.addEventListener('click', function () {
      setOpen(!isOpen());
    });
    backdrop.addEventListener('click', function () { setOpen(false); });

    // Toque num item: o tile acende na cor ativa por um instante e depois navega
    bubble.addEventListener('pointerdown', function (e) {
      var item = e.target.closest('.mnav-bubble-item');
      if (item) item.classList.add('is-pressed');
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (tipo) {
      bubble.addEventListener(tipo, function (e) {
        var item = e.target.closest && e.target.closest('.mnav-bubble-item');
        if (item && tipo !== 'pointerup') item.classList.remove('is-pressed');
      });
    });
    bubble.addEventListener('click', function (e) {
      var item = e.target.closest('.mnav-bubble-item');
      if (!item || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      item.classList.add('is-pressed');
      setTimeout(function () { window.location.href = item.getAttribute('href'); }, reduzMovimento.matches ? 0 : 160);
    });

    // Voltar pelo histórico (bfcache): balão fechado e sem item aceso
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      bubble.querySelectorAll('.is-pressed').forEach(function (i) { i.classList.remove('is-pressed'); });
      if (isOpen()) { setOpen(false); bubble.hidden = true; bubble.classList.remove('is-closing'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
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
    bindTabBar(activePage);
  };
})();
