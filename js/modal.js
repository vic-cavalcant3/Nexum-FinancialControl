// Modais (desktop) / bottom sheets (mobile).
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

  function open(el, opts) {
    if (!el || stack.some(function (s) { return s.el === el; })) return;
    var entry = { el: el, opts: opts || {}, returnTo: document.activeElement };
    stack.push(entry);
    el.classList.remove('is-closing');
    el.hidden = false;
    document.body.classList.add('has-modal');

    var alvo = el.querySelector('[autofocus]') || focusables(el)[0];
    // espera o próximo frame para o elemento estar visível
    requestAnimationFrame(function () { if (alvo) alvo.focus({ preventScroll: true }); });
  }

  function close(el, silent) {
    var i = -1;
    stack.forEach(function (s, j) { if (s.el === el) i = j; });
    if (i === -1) return;
    var entry = stack.splice(i, 1)[0];

    function done() {
      el.hidden = true;
      el.classList.remove('is-closing');
      if (!stack.length) document.body.classList.remove('has-modal');
    }

    if (reduced()) done();
    else {
      el.classList.add('is-closing');
      setTimeout(done, DURATION);
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
  };
})();
