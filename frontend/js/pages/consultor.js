// Consultor IA: chat com o Claude pelas rotas /api/consultor (a chave da Anthropic fica só no backend).
// Conversas salvas no servidor: painel lateral no desktop, modal "Suas conversas" no mobile.
// Depende de: js/api.js, js/util.js, js/modal.js, js/toast.js, js/icons.js.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var desktop = window.matchMedia('(min-width: 1024px)');
  var chat = $('cs-chat'), form = $('cs-form'), input = $('cs-texto'), btn = $('cs-send');
  var sugestoes = $('cs-suggest'), usoEl = $('cs-uso');
  var modalLista = $('modal-conversas'), modalApagar = $('modal-apagar');
  var KEY_ATUAL = 'nexum-consultor-conversa';
  var ALTURA_MAX = 120; // textarea cresce até ~5 linhas

  var conversas = [];   // [{ id, titulo, atualizado_em }]
  var atual = null;     // id da conversa aberta (null = conversa nova, criada no primeiro envio)
  var mensagens = [];   // [{ papel, conteudo }]
  var uso = null;       // { usadas_hoje, limite }
  var ocupado = false;  // esperando o Claude
  var carregando = false;
  var indisponivel = false;

  // ---------- Ícones ----------
  document.querySelector('.bh-back').innerHTML = ICONS.back;
  btn.innerHTML = ICONS.send;
  $('cs-abrir-lista').innerHTML = ICONS.chats;
  document.querySelector('.cs-hbtn[data-nova]').innerHTML = ICONS['plus-sm'];
  document.querySelectorAll('.modal-close').forEach(function (b) { b.innerHTML = ICONS.close; });

  function placeholder() {
    if (indisponivel) { input.placeholder = 'Consultor IA indisponível no momento'; return; }
    if (limiteAtingido()) { input.placeholder = 'Limite de hoje atingido. Volte amanhã!'; return; }
    input.placeholder = desktop.matches ? 'Pergunte algo sobre suas finanças...' : 'Pergunte algo...';
  }
  if (desktop.addEventListener) desktop.addEventListener('change', placeholder);
  else if (desktop.addListener) desktop.addListener(placeholder);

  // ---------- Markdown simples e SEGURO ----------
  // Escapa o HTML primeiro; depois só entende **negrito**, listas ("- ", "1. ") e parágrafos.
  function md(texto) {
    var linhas = U.esc(texto).replace(/\r\n?/g, '\n').split('\n');
    var out = [], par = [], lista = null;
    function inline(s) { return s.replace(/\*\*(?=\S)(.+?)\*\*/g, '<strong>$1</strong>'); }
    function fechaPar() {
      if (par.length) { out.push('<p>' + par.map(inline).join('<br>') + '</p>'); par = []; }
    }
    function fechaLista() {
      if (lista) {
        out.push('<' + lista.tipo + '>' + lista.itens.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') +
          '</' + lista.tipo + '>');
        lista = null;
      }
    }
    function item(tipo, txt) {
      fechaPar();
      if (!lista || lista.tipo !== tipo) { fechaLista(); lista = { tipo: tipo, itens: [] }; }
      lista.itens.push(txt);
    }
    linhas.forEach(function (l) {
      var t = l.trim(), m;
      if (!t) { fechaPar(); fechaLista(); return; }
      if ((m = /^[-*•]\s+(.+)$/.exec(t))) { item('ul', m[1]); return; }
      if ((m = /^\d+[.)]\s+(.+)$/.exec(t))) { item('ol', m[1]); return; }
      if ((m = /^#{1,6}\s+(.+)$/.exec(t))) t = '**' + m[1].replace(/\*\*/g, '') + '**'; // título vira negrito
      fechaLista();
      par.push(t);
    });
    fechaPar();
    fechaLista();
    return out.join('');
  }

  // ---------- Mensagens ----------
  var AVATAR = '<span class="cs-avatar" aria-hidden="true">' + ICONS.spark + '</span>';

  function msgHTML(m) {
    if (m.papel === 'USER') {
      return '<div class="cs-bubble cs-user"><span class="sr-only">Você: </span>' + U.esc(m.conteudo) + '</div>';
    }
    return '<div class="cs-msg">' + AVATAR + '<div class="cs-bubble cs-md"><span class="sr-only">Consultor: </span>' +
      md(m.conteudo) + '</div></div>';
  }

  function boasVindasHTML() {
    var nome = U.primeiroNome();
    return msgHTML({
      papel: 'ASSISTANT',
      conteudo: 'Oi' + (nome ? ', ' + nome : '') + '! Sou o Consultor IA do Nexum. Posso analisar seus gastos, ' +
        'seu orçamento e suas metas e sugerir ajustes práticos. Por onde começamos?'
    });
  }

  function rolarFim() { chat.scrollTop = chat.scrollHeight; }

  function renderChat() {
    if (carregando) {
      chat.innerHTML = '<div class="cs-msg">' + AVATAR + '<div class="cs-bubble">' + digitandoHTML('Carregando conversa') + '</div></div>';
    } else {
      chat.innerHTML = boasVindasHTML() + mensagens.map(msgHTML).join('');
    }
    rolarFim();
    atualizarControles();
  }

  function adicionar(m) {
    mensagens.push(m);
    chat.insertAdjacentHTML('beforeend', msgHTML(m));
    rolarFim();
    return chat.lastElementChild;
  }

  function digitandoHTML(rotulo) {
    return '<span class="cs-typing" role="status"><span class="cs-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '<span class="cs-typing-txt">' + U.esc(rotulo || 'digitando...') + '</span></span>';
  }

  function mostrarDigitando() {
    var el = document.createElement('div');
    el.className = 'cs-msg';
    el.id = 'cs-digitando';
    el.innerHTML = AVATAR + '<div class="cs-bubble">' + digitandoHTML() + '</div>';
    chat.appendChild(el);
    rolarFim();
  }

  function aviso(texto) {
    var el = document.createElement('p');
    el.className = 'cs-notice';
    el.setAttribute('role', 'alert');
    el.textContent = texto;
    chat.appendChild(el);
    rolarFim();
  }

  // ---------- Uso do dia ----------
  function limiteAtingido() { return !!uso && uso.usadas_hoje >= uso.limite; }

  function renderUso() {
    if (!uso) { usoEl.textContent = ''; usoEl.classList.remove('is-limit'); return; }
    var acabou = limiteAtingido();
    usoEl.classList.toggle('is-limit', acabou);
    usoEl.textContent = acabou
      ? 'Você usou suas ' + uso.limite + ' mensagens de hoje. Volte amanhã!'
      : Math.min(uso.usadas_hoje, uso.limite) + ' de ' + uso.limite + ' mensagens hoje';
  }

  // Campo, botão e chips conforme o estado.
  function atualizarControles() {
    var bloqueado = indisponivel || limiteAtingido();
    input.disabled = bloqueado;
    btn.disabled = bloqueado || ocupado || carregando || !input.value.trim();
    sugestoes.hidden = bloqueado || carregando || mensagens.length > 0;
    sugestoes.querySelectorAll('.cs-chip').forEach(function (c) { c.disabled = ocupado; });
    placeholder();
    renderUso();
  }

  // ---------- Lista de conversas ----------
  function dataCurta(iso) {
    var d = new Date(iso), hoje = new Date();
    var ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
    var hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (U.mesmoDia(d, hoje)) return 'Hoje, ' + hora;
    if (U.mesmoDia(d, ontem)) return 'Ontem, ' + hora;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: d.getFullYear() === hoje.getFullYear() ? undefined : '2-digit' });
  }

  function tituloDe(c) { return c.titulo || 'Nova conversa'; }

  function renderLista() {
    var html = conversas.length ? conversas.map(function (c) {
      var ativa = c.id === atual;
      return '<li class="cs-item' + (ativa ? ' is-active' : '') + '">' +
        '<button type="button" class="cs-item-open" data-abrir="' + c.id + '"' + (ativa ? ' aria-current="true"' : '') + '>' +
          '<span class="cs-item-title">' + U.esc(tituloDe(c)) + '</span>' +
          '<span class="cs-item-date">' + U.esc(dataCurta(c.atualizado_em)) + '</span></button>' +
        '<button type="button" class="cs-item-del" data-apagar="' + c.id + '" aria-label="Apagar conversa: ' +
          U.esc(tituloDe(c)) + '">' + ICONS.trash + '</button>' +
      '</li>';
    }).join('') : '<li class="cs-empty">Nenhuma conversa ainda. Faça sua primeira pergunta!</li>';
    $('cs-list-d').innerHTML = html;
    $('cs-list-m').innerHTML = html;
  }

  function lembrar(id) {
    try { if (id) sessionStorage.setItem(KEY_ATUAL, String(id)); else sessionStorage.removeItem(KEY_ATUAL); } catch (e) {}
  }

  // ---------- Abrir / nova ----------
  async function abrir(id) {
    if (ocupado) return;
    atual = id;
    lembrar(id);
    mensagens = [];
    carregando = true;
    renderLista();
    renderChat();
    try {
      var c = await Consultor.buscarConversa(id);
      if (atual !== id) return; // trocou de conversa enquanto carregava
      mensagens = (c.mensagens || []).map(function (m) { return { papel: m.papel, conteudo: m.conteudo }; });
    } catch (err) {
      console.error(err);
      if (atual !== id) return;
      // Apagada em outra aba (404) ou falha de rede: volta para uma conversa nova.
      conversas = conversas.filter(function (c2) { return c2.id !== id; });
      atual = null;
      lembrar(null);
      carregando = false;
      renderLista();
      renderChat();
      aviso(U.erroMsg(err));
      return;
    }
    carregando = false;
    renderChat();
  }

  function nova() {
    if (ocupado) return;
    atual = null;
    lembrar(null);
    mensagens = [];
    carregando = false;
    renderLista();
    renderChat();
    if (Modal.isOpen(modalLista)) Modal.close(modalLista, true);
    if (!input.disabled && desktop.matches) input.focus();
  }

  // ---------- Enviar ----------
  async function enviar(texto) {
    texto = String(texto || '').trim();
    if (!texto || ocupado || carregando || indisponivel || limiteAtingido()) return;
    if (texto.length > 1000) { aviso('A pergunta pode ter no máximo 1000 caracteres.'); return; }

    ocupado = true;
    input.value = '';
    ajustarAltura();
    var anteriores = mensagens.length;
    var balao = adicionar({ papel: 'USER', conteudo: texto });
    sugestoes.hidden = true;
    mostrarDigitando();
    atualizarControles();

    try {
      var id = atual;
      if (!id) {
        var c = await Consultor.criarConversa();
        id = c.id;
        atual = id;
        lembrar(id);
        conversas.unshift(c);
        renderLista();
      }
      var r = await Consultor.enviarMensagem(id, texto);
      $('cs-digitando') && $('cs-digitando').remove();
      adicionar({ papel: 'ASSISTANT', conteudo: r.resposta.conteudo });
      uso = r.uso || uso;
      // Sobe a conversa na lista com o título novo
      conversas = conversas.filter(function (c2) { return c2.id !== r.conversa.id; });
      conversas.unshift(r.conversa);
      renderLista();
    } catch (err) {
      console.error(err);
      $('cs-digitando') && $('cs-digitando').remove();
      // A pergunta não foi salva: tira o balão e devolve o texto ao campo.
      mensagens = mensagens.slice(0, anteriores);
      if (balao && balao.parentNode) balao.remove();
      input.value = texto;
      ajustarAltura();
      aviso(U.erroMsg(err));
      try { uso = await Consultor.uso(); } catch (e2) { /* mantém o anterior */ }
    } finally {
      ocupado = false;
      atualizarControles();
      if (!input.disabled && desktop.matches) input.focus();
    }
  }

  // ---------- Campo ----------
  function ajustarAltura() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, ALTURA_MAX) + 'px';
    input.style.overflowY = input.scrollHeight > ALTURA_MAX ? 'auto' : 'hidden';
  }

  input.addEventListener('input', function () { ajustarAltura(); atualizarControles(); });

  // Enter envia; Shift+Enter quebra a linha (e não envia no meio de uma composição de acento).
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      enviar(input.value);
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    enviar(input.value);
  });

  sugestoes.addEventListener('click', function (e) {
    var chip = e.target.closest('.cs-chip');
    if (chip) enviar(chip.textContent);
  });

  // ---------- Lista: abrir, nova, apagar ----------
  document.querySelectorAll('[data-nova]').forEach(function (b) { b.addEventListener('click', nova); });

  $('cs-abrir-lista').addEventListener('click', function () {
    renderLista();
    Modal.open(modalLista);
  });

  var apagando = null;

  function cliqueLista(e) {
    var del = e.target.closest('[data-apagar]');
    if (del) { pedirApagar(Number(del.getAttribute('data-apagar'))); return; }
    var abre = e.target.closest('[data-abrir]');
    if (!abre) return;
    if (Modal.isOpen(modalLista)) Modal.close(modalLista, true);
    var id = Number(abre.getAttribute('data-abrir'));
    if (id !== atual || carregando) abrir(id);
  }
  $('cs-list-d').addEventListener('click', cliqueLista);
  $('cs-list-m').addEventListener('click', cliqueLista);

  function pedirApagar(id) {
    var c = conversas.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    apagando = c;
    $('cs-apagar-texto').textContent = 'Tem certeza que deseja apagar "' + tituloDe(c) + '"? ' +
      'Todas as mensagens dela serão apagadas. Essa ação não pode ser desfeita.';
    $('cs-apagar-erro').hidden = true;
    $('cs-apagar-ok').disabled = false;
    Modal.open(modalApagar);
  }

  $('cs-apagar-ok').addEventListener('click', async function () {
    if (!apagando) return;
    var b = this;
    b.disabled = true;
    try {
      await Consultor.apagarConversa(apagando.id);
    } catch (err) {
      $('cs-apagar-erro').textContent = U.erroMsg(err);
      $('cs-apagar-erro').hidden = false;
      b.disabled = false;
      return;
    }
    var id = apagando.id;
    apagando = null;
    Modal.close(modalApagar, true);
    conversas = conversas.filter(function (c) { return c.id !== id; });
    if (id === atual && !ocupado) nova();
    else renderLista();
    showToast('Conversa apagada.');
  });

  // ---------- Início ----------
  async function iniciar() {
    $('cs-alert').hidden = true;
    indisponivel = false;
    carregando = true;
    renderChat();
    try {
      var r = await Promise.all([Consultor.listarConversas(), Consultor.uso()]);
      conversas = r[0] || [];
      uso = r[1] || null;
    } catch (err) {
      console.error(err);
      indisponivel = true;
      carregando = false;
      conversas = [];
      uso = null;
      $('cs-alert-txt').textContent = U.erroMsg(err);
      $('cs-alert').hidden = false;
      renderLista();
      renderChat();
      return;
    }
    carregando = false;
    var salvo = null;
    try { salvo = Number(sessionStorage.getItem(KEY_ATUAL)) || null; } catch (e) {}
    var existe = function (id) { return conversas.some(function (c) { return c.id === id; }); };
    if (salvo && existe(salvo)) abrir(salvo);
    else if (conversas.length) abrir(conversas[0].id);
    else nova();
  }

  $('cs-retry').addEventListener('click', iniciar);

  ajustarAltura();
  iniciar();
})();
