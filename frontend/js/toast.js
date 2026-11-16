function showToast(msg, ms) {
  var el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  // força reflow para reiniciar a transição
  void el.offsetWidth;
  el.classList.add('is-visible');
  clearTimeout(el._t);
  el._t = setTimeout(function () { el.classList.remove('is-visible'); }, ms || 2000);
}
