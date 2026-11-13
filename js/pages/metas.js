// Metas: lista com progresso e ritmo, criar / editar / excluir.
// Depende de: js/api.js, js/util.js, js/modal.js, js/icons.js, js/toast.js.
// metas.html?nova=1 abre o modal "Nova meta" (botão da dashboard).
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var desktop = window.matchMedia('(min-width: 1024px)');

  var metas = [];
  var editando = null;

  // ---------- Ícones estáticos ----------
  document.querySelector('.ph-add').innerHTML = ICONS['plus-sm'];
  document.querySelector('#modal-meta .modal-close').innerHTML = ICONS.close;

  // ---------- Formatação ----------
  // Prazo vem como data à meia-noite UTC: usar as partes UTC para não voltar um dia/mês.
  function prazoData(iso) {
    var d = new Date(iso);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);
  }
  function prazoTxt(d) {
    var m = U.mesAbrev(d);
    return m.charAt(0).toUpperCase() + m.slice(1) + ', ' + d.getFullYear();
  }
  function meses(n) { return n + (n === 1 ? ' mês' : ' meses'); }

  function normalizar(m) {
    var alvo = U.num(m.valor_alvo), atual = U.num(m.valor_atual), aporte = U.num(m.aporte_mensal);
    var faltam = Math.max(0, alvo - atual);
    var frac = alvo > 0 ? Math.min(1, atual / alvo) : 0;
    return {
      id: m.id_meta,
      nome: m.descricao || 'Meta',
      alvo: alvo,
      atual: atual,
      aporte: aporte,
      faltam: faltam,
      frac: frac,
      pct: Math.floor(frac * 100),
      prazo: prazoData(m.data_prazo),
      ritmo: faltam > 0 && aporte > 0 ? Math.ceil(faltam / aporte) : null,
      icone: U.iconeMeta(m.id_meta)
    };
  }

  // ---------- Render ----------
  function cardHTML(m) {
    var ic = U.META_ICONES[m.icone];
    var paceM, paceD;
    if (m.faltam <= 0) {
      paceM = paceD = 'Meta alcançada.';
    } else if (m.ritmo) {
      paceM = 'Faltam ' + U.moedaInt(m.faltam) + ' · no seu ritmo, ' + meses(m.ritmo);
      paceD = 'No seu ritmo atual, você alcança essa meta em ' + meses(m.ritmo) + '.';
    } else {
      paceM = paceD = 'Faltam ' + U.moedaInt(m.faltam) + ' para alcançar essa meta.';
    }

    return '<button type="button" class="mtc" data-id="' + m.id + '" aria-label="Editar meta ' + U.esc(m.nome) + '">' +
      '<span class="mtc-head">' +
        '<span class="mtc-title">' +
          '<span class="mtc-tile" aria-hidden="true">' + ICONS[ic ? ic.icon : 'metas'] + '</span>' +
          '<span class="mtc-titles"><span class="mtc-name">' + U.esc(m.nome) + '</span>' +
          (ic ? '<span class="mtc-kind">' + U.esc(ic.tipo) + '</span>' : '') + '</span>' +
        '</span>' +
        '<span class="mtc-deadline"><span class="mtc-cap">Prazo</span>' +
          '<span class="mtc-date">' + U.esc(prazoTxt(m.prazo)) + '</span></span>' +
      '</span>' +
      '<span class="mtc-progress">' +
        '<span class="mtc-amount">' +
          '<span class="mtc-amount-left"><span class="mtc-cap only-d">Progresso atual</span>' +
            '<span class="mtc-values"><span class="mtc-current">' + U.esc(U.moedaInt(m.atual)) + '</span>' +
            '<span class="mtc-target">/ ' + U.esc(U.moedaInt(m.alvo)) + '</span></span></span>' +
          '<span class="mtc-pct only-m">' + m.pct + '%</span>' +
        '</span>' +
        '<span class="mtc-bar">' +
          '<span class="mtc-labels only-d"><span class="mtc-done">' + m.pct + '% concluído</span>' +
            '<span class="mtc-left">Faltam ' + U.esc(U.moedaInt(m.faltam)) + '</span></span>' +
          '<span class="pbar" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + m.pct + '">' +
            '<span class="pbar-fill" style="width:' + (m.frac * 100).toFixed(2) + '%"></span></span>' +
        '</span>' +
      '</span>' +
      '<span class="mtc-pace">' + ICONS['goal-gauge'] +
        '<span class="mtc-pace-text"><span class="only-m">' + U.esc(paceM) + '</span><span class="only-d">' + U.esc(paceD) + '</span></span></span>' +
    '</button>';
  }

  function render() {
    var el = $('mt-grid');
    if (!metas.length) {
      el.innerHTML = '<p class="empty-state mt-empty">Nenhuma meta ainda. Crie a primeira!</p>';
      return;
    }
    el.innerHTML = metas.map(cardHTML).join('');
  }

  function renderLoading() {
    var s = function (w, h) { return '<span class="skel" style="width:' + w + 'px;height:' + h + 'px"></span>'; };
    var card = '<div class="mtc"><span class="mtc-head"><span class="mtc-title"><span class="mtc-tile"></span>' + s(120, 15) +
      '</span>' + s(50, 24) + '</span><span class="mtc-amount">' + s(110, 22) + s(30, 15) + '</span>' +
      '<span class="pbar"></span><span class="mtc-pace">' + s(180, 12) + '</span></div>';
    $('mt-grid').innerHTML = card + card + card;
  }

  // Ordem de criação (igual ao Figma).
  function ordenar(lista) {
    return lista.map(normalizar).sort(function (a, b) { return a.id - b.id; });
  }

  async function carregar() {
    $('mt-alert').hidden = true;
    renderLoading();
    try {
      metas = ordenar(await Metas.listar() || []);
      render();
      return true;
    } catch (err) {
      console.error(err);
      $('mt-grid').innerHTML = '';
      $('mt-alert').hidden = false;
      return false;
    }
  }
  $('mt-retry').addEventListener('click', carregar);

  async function recarregar() {
    try { metas = ordenar(await Metas.listar() || []); } catch (e) { console.error(e); }
    render();
  }

  $('mt-grid').addEventListener('click', function (e) {
    var card = e.target.closest('button.mtc');
    if (!card) return;
    var id = Number(card.getAttribute('data-id'));
    var m = metas.filter(function (x) { return x.id === id; })[0];
    if (m) abrir(m);
  });

  // ---------- Modal ----------
  var modal = $('modal-meta');
  var form = $('form-meta');
  var inNome = $('mt-nome'), inAlvo = $('mt-alvo'), inAtual = $('mt-atual'), inPrazo = $('mt-prazo'), selIcone = $('mt-icone');
  var erroEl = $('mt-erro');
  var btnSalvar = $('mt-salvar'), btnExcluir = $('mt-excluir'), btnCancelar = $('mt-cancelar');
  var confirmando = false;

  U.mascaraMoeda(inAlvo);
  U.mascaraMoeda(inAtual);

  Object.keys(U.META_ICONES).forEach(function (k) {
    var o = document.createElement('option');
    o.value = k;
    o.textContent = U.META_ICONES[k].nome;
    selIcone.appendChild(o);
  });

  function syncVazio() {
    selIcone.classList.toggle('is-empty', !selIcone.value);
    inPrazo.classList.toggle('is-empty', !inPrazo.value);
  }
  selIcone.addEventListener('change', syncVazio);
  inPrazo.addEventListener('change', syncVazio);

  function mostrarErro(msg) { erroEl.textContent = msg; erroEl.hidden = !msg; }

  function resetExclusao() { confirmando = false; btnExcluir.textContent = 'Excluir'; }

  function textoSalvar() { return editando ? 'Salvar meta' : 'Criar meta'; }

  function abrir(m) {
    editando = m || null;
    form.reset();
    mostrarErro('');
    resetExclusao();
    [inNome, inAlvo, inPrazo].forEach(function (i) { i.classList.remove('is-error'); });

    $('modal-meta-title').textContent = m ? 'Editar meta' : 'Nova meta';
    btnSalvar.textContent = textoSalvar();
    btnExcluir.hidden = !m;
    btnCancelar.hidden = !!m;

    if (m) {
      inNome.value = m.nome;
      inAlvo.value = U.moeda(m.alvo);
      inAtual.value = m.atual ? U.moeda(m.atual) : '';
      inPrazo.value = U.isoDia(m.prazo);
      selIcone.value = m.icone || '';
    }
    syncVazio();
    inNome.toggleAttribute('autofocus', desktop.matches);
    Modal.open(modal);
  }

  document.querySelectorAll('[data-nova]').forEach(function (b) {
    b.addEventListener('click', function () { abrir(null); });
  });

  // Meses inteiros entre hoje e o prazo (mínimo 1).
  function mesesAte(d) {
    var h = new Date();
    return Math.max(1, (d.getFullYear() - h.getFullYear()) * 12 + d.getMonth() - h.getMonth());
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    mostrarErro('');
    var nome = inNome.value.trim();
    var alvo = U.parseValor(inAlvo.value);
    var atual = inAtual.value ? U.parseValor(inAtual.value) : 0;
    inNome.classList.toggle('is-error', !nome);
    inAlvo.classList.toggle('is-error', !(alvo > 0));
    inPrazo.classList.toggle('is-error', !inPrazo.value);
    if (!nome) return mostrarErro('Informe o nome da meta.');
    if (!(alvo > 0)) return mostrarErro('Informe um valor objetivo maior que zero.');
    if (!(atual >= 0)) return mostrarErro('Informe um valor guardado válido.');
    if (!inPrazo.value) return mostrarErro('Informe a data prevista.');

    var prazo = U.dataLocal(inPrazo.value);
    var faltam = Math.max(0, alvo - atual);
    // O formulário não pede aporte: na criação, o ritmo é o necessário para chegar no prazo.
    var aporte = editando && editando.aporte > 0 ? editando.aporte : Math.ceil(faltam / mesesAte(prazo));

    var dados = {
      descricao: nome,
      valor_alvo: alvo,
      valor_atual: atual,
      aporte_mensal: aporte,
      data_prazo: inPrazo.value
    };
    if (!editando) dados.data_inicio = U.isoDia(new Date());

    btnSalvar.disabled = btnExcluir.disabled = true;
    btnSalvar.textContent = 'Salvando...';
    try {
      var salvo = editando ? await Metas.atualizar(editando.id, dados) : await Metas.criar(dados);
      U.setIconeMeta(editando ? editando.id : salvo.id_meta, selIcone.value);
      var eraEdicao = !!editando;
      Modal.close(modal, true);
      await recarregar();
      if (eraEdicao) showToast('Meta atualizada');
      else showSuccess('Meta criada!', 'Sua nova meta já está sendo acompanhada.', null, { botao: 'Ver metas', compacto: true });
    } catch (err) {
      mostrarErro(U.erroMsg(err));
    } finally {
      btnSalvar.disabled = btnExcluir.disabled = false;
      btnSalvar.textContent = textoSalvar();
    }
  });

  btnExcluir.addEventListener('click', async function () {
    if (!editando) return;
    if (!confirmando) { confirmando = true; btnExcluir.textContent = 'Confirmar exclusão'; return; }
    btnSalvar.disabled = btnExcluir.disabled = true;
    try {
      await Metas.deletar(editando.id);
      U.setIconeMeta(editando.id, null);
      Modal.close(modal, true);
      await recarregar();
      showToast('Meta excluída');
    } catch (err) {
      mostrarErro(U.erroMsg(err));
    } finally {
      btnSalvar.disabled = btnExcluir.disabled = false;
      resetExclusao();
    }
  });

  // ---------- Início ----------
  carregar().then(function () {
    if (new URLSearchParams(location.search).get('nova') === '1') {
      abrir(null);
      // Tira o ?nova=1 da URL para não reabrir ao recarregar.
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
    }
  });
})();
