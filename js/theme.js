// Carregar no <head> SEM defer, para aplicar o tema antes da pintura.
// Modos: 'system' (padrão, segue o dispositivo ao vivo) | 'light' | 'dark'.
(function () {
  var KEY = 'nexum-theme';
  var MODES = ['system', 'light', 'dark'];
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function readMode() {
    var m = null;
    try { m = localStorage.getItem(KEY); } catch (e) {}
    return MODES.indexOf(m) !== -1 ? m : 'system';
  }

  var mode = readMode();

  function resolve(m) {
    if (m === 'light' || m === 'dark') return m;
    return mq && mq.matches ? 'dark' : 'light';
  }

  function apply() {
    var theme = resolve(mode);
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-mode', mode);
    syncSwitches();
    try {
      document.dispatchEvent(new CustomEvent('themechange', { detail: { mode: mode, theme: theme } }));
    } catch (e) {}
  }

  // Seletores [data-theme-option="system|light|dark"] marcam o modo ativo e trocam ao clicar.
  function syncSwitches() {
    var opts = document.querySelectorAll('[data-theme-option]');
    for (var i = 0; i < opts.length; i++) {
      var active = opts[i].getAttribute('data-theme-option') === mode;
      opts[i].setAttribute('aria-checked', String(active));
      opts[i].classList.toggle('is-active', active);
    }
  }

  window.setTheme = function (m) {
    if (MODES.indexOf(m) === -1) return;
    mode = m;
    try { localStorage.setItem(KEY, m); } catch (e) {}
    apply();
  };

  window.getThemeMode = function () {
    return mode;
  };

  // Modo 'system': acompanha a troca do dispositivo sem recarregar.
  if (mq) {
    var onChange = function () { if (mode === 'system') apply(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  // Outra aba mudou o modo.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { mode = readMode(); apply(); }
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-theme-option]');
    if (btn) window.setTheme(btn.getAttribute('data-theme-option'));
  });

  document.addEventListener('DOMContentLoaded', syncSwitches);

  apply();
})();
