// Dicas: linha do tempo de conteúdos (window.NEXUM_DICAS, em js/data/dicas.js) com filtro por tipo.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var dicas = window.NEXUM_DICAS || [];

  // Ordem dos grupos na linha do tempo = ordem dos filtros
  var TIPOS = {
    livro: { label: 'Livro', grupo: 'Livros', icon: 'tip-book', filtro: 'livros' },
    video: { label: 'Vídeo', grupo: 'Vídeos', icon: 'tip-play', filtro: 'videos' },
    podcast: { label: 'Podcast', grupo: 'Podcasts', icon: 'tip-other', filtro: 'podcasts' },
    curso: { label: 'Curso', grupo: 'Cursos', icon: 'goal-cap', filtro: 'cursos' },
    ferramenta: { label: 'Ferramenta', grupo: 'Ferramentas', icon: 'goal-shield', filtro: 'ferramentas' }
  };
  var ORDEM = Object.keys(TIPOS);

  if (window.NEXUM_DICAS_ATUALIZADO) $('dc-updated').textContent = 'Atualizado em ' + window.NEXUM_DICAS_ATUALIZADO;

  var chips = document.querySelectorAll('.dc-chip');
  var validos = [].map.call(chips, function (c) { return c.getAttribute('data-f'); });

  var filtro = 'todos';
  try { filtro = sessionStorage.getItem('nexum-dicas-filtro') || 'todos'; } catch (e) {}
  if (validos.indexOf(filtro) < 0) filtro = 'todos';

  function doFiltro(d) { return filtro === 'todos' || (TIPOS[d.tipo] && TIPOS[d.tipo].filtro === filtro); }

  // ---------- Filtros ----------
  chips.forEach(function (c) {
    var f = c.getAttribute('data-f');
    var n = dicas.filter(function (d) { return f === 'todos' || (TIPOS[d.tipo] && TIPOS[d.tipo].filtro === f); }).length;
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

    var lista = dicas.filter(function (d) { return TIPOS[d.tipo] && doFiltro(d); })
      .sort(function (a, b) { return ORDEM.indexOf(a.tipo) - ORDEM.indexOf(b.tipo); });

    if (!lista.length) {
      $('dc-timeline').innerHTML = '<li class="empty-state">Nenhuma dica nesta categoria.</li>';
      return;
    }

    var total = {};
    lista.forEach(function (d) { total[d.tipo] = (total[d.tipo] || 0) + 1; });

    $('dc-timeline').innerHTML = lista.map(function (d, i) {
      var t = TIPOS[d.tipo];
      // Coluna da esquerda (desktop): nome do grupo no primeiro item de cada tipo
      var inicio = i === 0 || lista[i - 1].tipo !== d.tipo;
      var n = total[d.tipo];
      var gratis = d.gratis ? '<span class="dc-free">Grátis</span>' : '';
      return '<li class="dc-item' + (inicio ? ' is-group-start' : '') + '">' +
        '<div class="dc-date only-d">' + (inicio
          ? '<span class="dc-date-main">' + U.esc(t.grupo) + '</span>' +
            '<span class="dc-date-sub">' + n + (n === 1 ? ' item' : ' itens') + '</span>'
          : '') + '</div>' +
        '<div class="dc-rail" aria-hidden="true"><span class="dc-dot"></span><span class="dc-line"></span></div>' +
        '<a class="dc-card" href="' + U.esc(d.link) + '" target="_blank" rel="noopener">' +
          '<div class="dc-top"><span class="dc-tags"><span class="dc-pill">' + ICONS[t.icon] + U.esc(t.label) + '</span>' + gratis + '</span>' +
            '<span class="dc-when only-d">' + U.esc(d.fonte) + '</span></div>' +
          '<h2 class="dc-title">' + U.esc(d.titulo) + '</h2>' +
          '<p class="dc-desc">' + U.esc(d.descricao) + '</p>' +
          '<p class="dc-info only-m">' + U.esc(d.fonte) + '</p>' +
          '<span class="sr-only">(abre em nova aba)</span>' +
        '</a>' +
      '</li>';
    }).join('');
  }

  render();
})();
