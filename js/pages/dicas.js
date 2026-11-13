// Dicas: linha do tempo de conteúdos (window.NEXUM_DICAS, em js/mock.js) com filtro por tipo.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var dicas = window.NEXUM_DICAS || [];

  var TIPOS = {
    artigo: { label: 'Artigo', icon: 'tip-other', grupo: 'outros' },
    podcast: { label: 'Podcast', icon: 'tip-other', grupo: 'outros' },
    video: { label: 'Vídeo', icon: 'tip-play', grupo: 'videos' },
    livro: { label: 'Livro', icon: 'tip-book', grupo: 'livros' }
  };

  var filtro = 'todas';
  try { filtro = sessionStorage.getItem('nexum-dicas-filtro') || 'todas'; } catch (e) {}

  function p2(n) { return (n < 10 ? '0' : '') + n; }

  function datas(diasAtras) {
    var h = new Date();
    var d = new Date(h.getFullYear(), h.getMonth(), h.getDate() - diasAtras);
    var curta = p2(d.getDate()) + ' ' + U.mesAbrev(d);
    return {
      mobile: diasAtras === 0 ? 'Hoje' : curta,
      principal: diasAtras === 0 ? 'Hoje' : curta,
      sub: diasAtras === 0 ? 'Novo' : diasAtras === 1 ? 'Ontem' : 'Há ' + diasAtras + ' dias'
    };
  }

  function grupo(d) { return (TIPOS[d.tipo] || TIPOS.artigo).grupo; }

  // ---------- Filtros ----------
  var chips = document.querySelectorAll('.dc-chip');
  chips.forEach(function (c) {
    var f = c.getAttribute('data-f');
    var n = f === 'todas' ? dicas.length : dicas.filter(function (d) { return grupo(d) === f; }).length;
    c.innerHTML = ICONS[c.getAttribute('data-icon')] + '<span>' + c.textContent + '</span>' +
      '<span class="dc-count only-d">' + n + '</span>';
    c.addEventListener('click', function () {
      filtro = f;
      try { sessionStorage.setItem('nexum-dicas-filtro', f); } catch (e) {}
      render();
    });
  });

  function render() {
    chips.forEach(function (c) {
      c.setAttribute('aria-selected', String(c.getAttribute('data-f') === filtro));
    });

    var lista = dicas.slice().sort(function (a, b) { return a.dias - b.dias; })
      .filter(function (d) { return filtro === 'todas' || grupo(d) === filtro; });

    if (!lista.length) {
      $('dc-timeline').innerHTML = '<li class="empty-state">Nenhuma dica nesta categoria.</li>';
      return;
    }

    $('dc-timeline').innerHTML = lista.map(function (d) {
      var t = TIPOS[d.tipo] || TIPOS.artigo;
      var dt = datas(d.dias);
      return '<li class="dc-item">' +
        '<div class="dc-date only-d"><span class="dc-date-main">' + U.esc(dt.principal) + '</span>' +
          '<span class="dc-date-sub">' + U.esc(dt.sub) + '</span></div>' +
        '<div class="dc-rail" aria-hidden="true"><span class="dc-dot"></span><span class="dc-line"></span></div>' +
        '<article class="dc-card">' +
          '<div class="dc-top"><span class="dc-pill">' + ICONS[t.icon] + U.esc(t.label) + '</span>' +
            '<span class="dc-when only-m">' + U.esc(dt.mobile) + '</span>' +
            '<span class="dc-when only-d">' + U.esc(d.info) + '</span></div>' +
          '<h2 class="dc-title">' + U.esc(d.titulo) + '</h2>' +
          '<p class="dc-desc"><span class="only-m">' + U.esc(d.m) + '</span><span class="only-d">' + U.esc(d.d) + '</span></p>' +
          '<p class="dc-info only-m">' + U.esc(d.info) + '</p>' +
        '</article>' +
      '</li>';
    }).join('');
  }

  render();
})();
