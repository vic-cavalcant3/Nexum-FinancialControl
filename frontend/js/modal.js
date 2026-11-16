// Modais: card centralizado (desktop e mobile; no mobile com header/footer fixos e rolagem interna).
// Estrutura: <div class="modal" hidden role="dialog" aria-modal="true" aria-labelledby="...">
//              <div class="modal-card"> ... <button data-modal-close> ... </div>
//            </div>
// Uso: Modal.open(el, { onClose: fn }) / Modal.close(el)
// Fecha com Esc, clique no fundo e qualquer [data-modal-close]. Foco fica preso dentro.
(function () {
  var stack = [];
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var DURATION = 160;

  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function focusables(el) {
    return Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function (n) {
      return n.offsetParent !== null || n === document.activeElement;
    });
  }

  function top() { return stack[stack.length - 1]; }

  var mobile = window.matchMedia ? window.matchMedia('(max-width: 1023px)') : { matches: false };
  var vv = window.visualViewport;

  // ---------- Trava o scroll da página atrás (sem pular no iOS) ----------
  var travaY = null;

  function travaScroll() {
    if (travaY !== null || !mobile.matches) return;
    travaY = window.scrollY || window.pageYOffset || 0;
    var s = document.body.style;
    s.position = 'fixed';
    s.top = -travaY + 'px';
    s.left = '0';
    s.right = '0';
    s.width = '100%';
  }

  function destravaScroll() {
    if (travaY === null) return;
    var s = document.body.style;
    s.position = s.top = s.left = s.right = s.width = '';
    window.scrollTo(0, travaY);
    travaY = null;
  }

  // ---------- Teclado do iPhone: card cabe na área visível e o campo focado aparece ----------
  function campoVisivel(el) {
    var a = document.activeElement;
    if (!a || !el.contains(a) || !/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
    var card = el.querySelector('.modal-card');
    if (!card || card.scrollHeight <= card.clientHeight) return;
    var head = card.querySelector('.modal-head');
    var acoes = card.querySelector('.modal-actions');
    var c = card.getBoundingClientRect();
    var r = a.getBoundingClientRect();
    var topo = c.top + (head ? head.offsetHeight : 0) + 8;
    var base = c.bottom - (acoes ? acoes.offsetHeight : 0) - 8;
    if (r.top < topo) card.scrollTop -= topo - r.top;
    else if (r.bottom > base) card.scrollTop += r.bottom - base;
  }

  function ajustaViewport() {
    var t = top();
    if (!t) return;
    if (!vv || !mobile.matches) {
      t.el.style.removeProperty('--vv-h');
      t.el.style.removeProperty('--vv-top');
      return;
    }
    t.el.style.setProperty('--vv-h', vv.height + 'px');
    t.el.style.setProperty('--vv-top', vv.offsetTop + 'px');
    campoVisivel(t.el);
  }

  if (vv) {
    vv.addEventListener('resize', ajustaViewport);
    vv.addEventListener('scroll', ajustaViewport);
  }

  document.addEventListener('focusin', function (e) {
    var t = top();
    if (!t || !t.el.contains(e.target)) return;
    // espera o teclado terminar de abrir
    setTimeout(function () { if (top() === t) campoVisivel(t.el); }, 300);
  });

  // ---------- Campo de data: no mobile o texto "15/11/2026" (ou "dd/mm/aaaa") fica por cima do input nativo ----------
  // O Safari do iPhone mostra "15 de nov. de 2026" (quebra a linha) ou nada quando vazio.
  function syncData(inp) {
    var v = inp.value;
    inp.classList.toggle('is-empty', !v);
    var ph = inp.parentNode.querySelector('.date-ph');
    if (!ph) return;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    ph.textContent = m ? m[3] + '/' + m[2] + '/' + m[1] : 'dd/mm/aaaa';
    ph.classList.toggle('is-empty', !m);
  }

  // ---------- Selects: placeholder curto "Selecione" no mobile ("Selecionar categoria/conta/ícone" no desktop) ----------
  function placeholdersSelects(root) {
    Array.prototype.forEach.call(root.querySelectorAll('select.field-input'), function (sel) {
      var op = sel.options[0];
      if (!op || op.value !== '') return;
      if (!op.dataset.full) {
        if (!/^Selecionar\b/.test(op.textContent)) return;
        op.dataset.full = op.textContent;
      }
      op.textContent = mobile.matches ? 'Selecione' : op.dataset.full;
    });
  }

  function preparaDatas(root) {
    Array.prototype.forEach.call(root.querySelectorAll('input[type="date"].field-input'), function (inp) {
      if (!inp.parentNode.classList.contains('date-wrap')) {
        var wrap = document.createElement('span');
        wrap.className = 'date-wrap';
        inp.parentNode.insertBefore(wrap, inp);
        wrap.appendChild(inp);
        var ph = document.createElement('span');
        ph.className = 'date-ph';
        ph.setAttribute('aria-hidden', 'true');
        ph.textContent = 'dd/mm/aaaa';
        wrap.appendChild(ph);
        ['input', 'change', 'blur', 'focus'].forEach(function (ev) {
          inp.addEventListener(ev, function () { syncData(inp); });
        });
      }
      syncData(inp);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { preparaDatas(document); });
  } else {
    preparaDatas(document);
  }

  function open(el, opts) {
    if (!el || stack.some(function (s) { return s.el === el; })) return;
    var entry = { el: el, opts: opts || {}, returnTo: document.activeElement };
    stack.push(entry);
    el.classList.remove('is-closing');
    el.hidden = false;
    document.body.classList.add('has-modal');
    travaScroll();
    preparaDatas(el);
    placeholdersSelects(el);
    ajustaViewport();
    // o JS da página pode preencher a data / recriar as opções logo depois de abrir
    requestAnimationFrame(function () { preparaDatas(el); placeholdersSelects(el); });

    var alvo = el.querySelector('[autofocus]') || focusables(el)[0];
    // espera o próximo frame para o elemento estar visível
    requestAnimationFrame(function () { if (alvo) alvo.focus({ preventScroll: true }); });
  }

  function close(el, silent) {
    var i = -1;
    stack.forEach(function (s, j) { if (s.el === el) i = j; });
    if (i === -1) return;
    var entry = stack.splice(i, 1)[0];

    clearTimeout(entry.autoFecha);

    function done() {
      el.hidden = true;
      el.classList.remove('is-closing');
      el.style.removeProperty('--vv-h');
      el.style.removeProperty('--vv-top');
      if (!stack.length) {
        document.body.classList.remove('has-modal');
        destravaScroll();
      }
    }

    if (reduced()) done();
    else {
      el.classList.add('is-closing');
      setTimeout(done, mobile.matches ? 140 : DURATION);
    }

    if (entry.returnTo && entry.returnTo.focus && document.contains(entry.returnTo)) {
      entry.returnTo.focus({ preventScroll: true });
    }
    if (!silent && typeof entry.opts.onClose === 'function') entry.opts.onClose();
  }

  // Clique no fundo / botões de fechar
  document.addEventListener('click', function (e) {
    var t = top();
    if (!t) return;
    if (e.target === t.el) { close(t.el); return; }
    var btn = e.target.closest && e.target.closest('[data-modal-close]');
    if (btn && t.el.contains(btn)) close(t.el);
  });

  document.addEventListener('keydown', function (e) {
    var t = top();
    if (!t) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(t.el);
      return;
    }
    if (e.key === 'Tab') {
      var f = focusables(t.el);
      if (!f.length) { e.preventDefault(); return; }
      var first = f[0], last = f[f.length - 1];
      if (!t.el.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  window.Modal = {
    open: open,
    close: close,
    isOpen: function (el) { return stack.some(function (s) { return s.el === el; }); }
  };

  // Modal de sucesso reutilizável (Transação salva / Meta criada / Orçamento atualizado)
  // opts: { botao: 'Concluir', compacto: true (texto 12,5px / ícone redondo — Meta criada e Orçamento atualizado) }
  window.showSuccess = function (titulo, texto, onDone, opts) {
    opts = opts || {};
    var el = document.getElementById('modal-sucesso');
    if (!el) {
      el = document.createElement('div');
      el.className = 'modal';
      el.id = 'modal-sucesso';
      el.hidden = true;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', 'modal-sucesso-titulo');
      el.innerHTML =
        '<div class="modal-card modal-success">' +
          '<span class="success-icon" aria-hidden="true">' + (typeof ICONS !== 'undefined' ? ICONS.check : '') + '</span>' +
          '<div class="success-text">' +
            '<h2 class="success-title" id="modal-sucesso-titulo"></h2>' +
            '<p class="success-desc"></p>' +
          '</div>' +
          '<button type="button" class="btn btn-primary" data-modal-close>Concluir</button>' +
        '</div>';
      document.body.appendChild(el);
    }
    el.querySelector('.success-title').textContent = titulo;
    el.querySelector('.success-desc').textContent = texto;
    el.querySelector('.btn').textContent = opts.botao || 'Concluir';
    el.querySelector('.modal-success').classList.toggle('is-compact', !!opts.compacto);
    open(el, { onClose: onDone });

    // Mobile: fecha sozinho após 2s ou ao tocar em qualquer lugar
    if (mobile.matches) {
      var entry = stack[stack.length - 1];
      entry.autoFecha = setTimeout(function () { close(el); }, 2000);
      if (!el.dataset.tocaFecha) {
        el.dataset.tocaFecha = '1';
        el.addEventListener('click', function () {
          if (mobile.matches && Modal.isOpen(el)) close(el);
        });
      }
    }
  };
})();
