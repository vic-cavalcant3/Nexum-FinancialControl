// Carregar no <head> SEM defer, para aplicar o tema antes da pintura.
(function () {
  var KEY = 'nexum-theme';
  var root = document.documentElement;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function preferred() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  var theme = stored();
  if (theme !== 'dark' && theme !== 'light') theme = preferred();
  root.setAttribute('data-theme', theme);

  window.toggleTheme = function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    return next;
  };
})();
