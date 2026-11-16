// Consultor IA: chat com respostas simuladas (consultorSimulado, em js/mock.js), atraso e "digitando".
// A conversa fica salva na aba (sessionStorage) enquanto ela estiver aberta.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var desktop = window.matchMedia('(min-width: 1024px)');
  var chat = $('cs-chat'), form = $('cs-form'), input = $('cs-texto'), btn = $('cs-send');
  var KEY = 'nexum-chat';
  var ocupado = false;

  document.querySelector('.bh-back').innerHTML = ICONS.back;
  btn.innerHTML = ICONS.send;

  function placeholder() {
    input.placeholder = desktop.matches ? 'Pergunte algo sobre suas finanças...' : 'Pergunte algo...';
  }
  placeholder();
  if (desktop.addEventListener) desktop.addEventListener('change', placeholder);
  else if (desktop.addListener) desktop.addListener(placeholder);

  // Conversa inicial do Figma (texto curto no mobile, completo no desktop).
  var nome = U.primeiroNome() || 'tudo bem';
  var INICIAL = [
    { de: 'ia',
      m: 'Oi, ' + nome + '! Notei que seus gastos com Lazer cresceram 24%. Quer que eu sugira um novo limite?',
      d: 'Oi, ' + nome + '! Analisei seus últimos 3 meses. Notei que seus gastos com Lazer cresceram 24% — quer que eu sugira um novo limite pro Planejamento?' },
    { de: 'eu', m: 'Sim, pode sugerir!', d: 'Sim, pode sugerir!' },
    { de: 'ia',
      m: 'Sugiro subir Lazer pra R$ 650 e cortar R$ 150 de Outros. Isso mantém sua economia em ~16%.',
      d: 'Baseado no seu padrão, sugiro reduzir o limite de Lazer de R$ 500 para R$ 650, mais realista, e cortar R$ 150 de Outros, categoria com menor prioridade pra você. Isso mantém sua economia mensal estável em ~16%. Quer aplicar essa mudança no Planejamento?' }
  ];

  function lerHistorico() {
    try { var h = JSON.parse(sessionStorage.getItem(KEY)); if (Array.isArray(h) && h.length) return h; } catch (e) {}
    return INICIAL.slice();
  }
  function salvar() { try { sessionStorage.setItem(KEY, JSON.stringify(historico)); } catch (e) {} }

  var historico = lerHistorico();

  function textoHTML(msg) {
    if (msg.m && msg.d && msg.m !== msg.d) {
      return '<span class="only-m">' + U.esc(msg.m) + '</span><span class="only-d">' + U.esc(msg.d) + '</span>';
    }
    return U.esc(msg.t || msg.m || msg.d);
  }

  function msgHTML(msg) {
    if (msg.de === 'eu') return '<div class="cs-bubble cs-user">' + textoHTML(msg) + '</div>';
    return '<div class="cs-msg"><span class="cs-avatar" aria-hidden="true">' + ICONS.spark + '</span>' +
      '<div class="cs-bubble"><span class="sr-only">Consultor: </span>' + textoHTML(msg) + '</div></div>';
  }

  function rolarFim() { chat.scrollTop = chat.scrollHeight; }

  function render() {
    chat.innerHTML = historico.map(msgHTML).join('');
    rolarFim();
  }

  function adicionar(msg) {
    historico.push(msg);
    salvar();
    chat.insertAdjacentHTML('beforeend', msgHTML(msg));
    rolarFim();
  }

  function setOcupado(sim) {
    ocupado = sim;
    btn.disabled = sim;
    document.querySelectorAll('.cs-chip').forEach(function (c) { c.disabled = sim; });
  }

  async function perguntar(texto) {
    texto = String(texto || '').trim();
    if (!texto || ocupado) return;
    adicionar({ de: 'eu', t: texto });
    setOcupado(true);

    var typing = document.createElement('div');
    typing.className = 'cs-msg';
    typing.innerHTML = '<span class="cs-avatar" aria-hidden="true">' + ICONS.spark + '</span>' +
      '<div class="cs-bubble"><span class="cs-typing" role="status" aria-label="Consultor digitando"><i></i><i></i><i></i></span></div>';
    chat.appendChild(typing);
    rolarFim();

    var resposta;
    try {
      resposta = typeof consultorSimulado === 'function'
        ? await consultorSimulado(texto)
        : 'O consultor está indisponível no momento. Tente de novo mais tarde.';
    } catch (e) {
      console.error(e);
      resposta = 'Não consegui analisar seus dados agora. Tente de novo em instantes.';
    }
    typing.remove();
    adicionar({ de: 'ia', t: resposta });
    setOcupado(false);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = input.value;
    input.value = '';
    perguntar(t);
    input.focus();
  });

  document.getElementById('cs-suggest').addEventListener('click', function (e) {
    var chip = e.target.closest('.cs-chip');
    if (chip) perguntar(chip.textContent);
  });

  render();
})();
