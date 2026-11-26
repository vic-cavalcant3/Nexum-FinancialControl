// Configurações: perfil (Auth.atualizarPerfil), senha (Auth.trocarSenha), preferências, tema e sair.
// Depende de: js/api.js, js/theme.js, js/util.js, js/modal.js, js/toast.js.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var desktop = window.matchMedia('(min-width: 1024px)');

  document.querySelector('.bh-back').innerHTML = ICONS.back;
  document.querySelectorAll('.modal-close').forEach(function (b) { b.innerHTML = ICONS.close; });

  function erro(el, msg) { el.textContent = msg || ''; el.hidden = !msg; }
  function foco(input) { input.toggleAttribute('autofocus', desktop.matches); }

  // ---------- Perfil ----------
  function renderPerfil() {
    var u = getUsuario() || {};
    $('cf-nome').textContent = u.nome || '';
    $('cf-email').textContent = u.email || '';
    // Mantém a sidebar (renderizada no carregamento) em dia.
    document.querySelectorAll('.sb-user-name').forEach(function (el) { el.textContent = u.nome || ''; el.title = u.nome || ''; });
    document.querySelectorAll('.sb-user-email').forEach(function (el) { el.textContent = u.email || ''; el.title = u.email || ''; });
  }

  var modalPerfil = $('modal-perfil');
  $('cf-editar').addEventListener('click', function () {
    var u = getUsuario() || {};
    $('pf-nome').value = u.nome || '';
    $('pf-email').value = u.email || '';
    erro($('pf-erro'));
    foco($('pf-nome'));
    Modal.open(modalPerfil);
  });

  $('form-perfil').addEventListener('submit', async function (e) {
    e.preventDefault();
    var nome = $('pf-nome').value.trim();
    var email = $('pf-email').value.trim();
    var errEl = $('pf-erro');
    if (!nome) return erro(errEl, 'Informe seu nome.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro(errEl, 'Informe um e-mail válido.');
    var btn = $('pf-salvar');
    btn.disabled = true;
    btn.textContent = 'Salvando...';
    try {
      var r = await Auth.atualizarPerfil(nome, email);
      var atual = getUsuario() || {};
      var novo = (r && (r.usuario || r)) || {};
      salvarSessao(Object.assign({}, atual, { nome: nome, email: email }, novo.id_usuario ? novo : {}));
      renderPerfil();
      Modal.close(modalPerfil, true);
      showToast('Perfil atualizado');
    } catch (err) {
      erro(errEl, U.erroMsg(err));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salvar';
    }
  });

  // ---------- Preferências (salvas no navegador) ----------
  var PREFS_KEY = 'nexum-prefs';
  var PADRAO = { email: true, alertas: true, ia: false };
  function prefs() { return Object.assign({}, PADRAO, U.store.get(PREFS_KEY, {})); }

  function renderPrefs() {
    var p = prefs();
    document.querySelectorAll('[data-pref]').forEach(function (s) {
      s.setAttribute('aria-checked', String(!!p[s.getAttribute('data-pref')]));
    });
  }

  document.querySelectorAll('[data-pref]').forEach(function (s) {
    s.addEventListener('click', function () {
      var p = prefs();
      var k = s.getAttribute('data-pref');
      p[k] = !p[k];
      U.store.set(PREFS_KEY, p);
      renderPrefs();
    });
  });

  // ---------- Senha ----------
  var SENHA_KEY = 'nexum-senha-alterada';
  function renderSenhaSub() {
    var iso = U.store.get(SENHA_KEY, null);
    if (!iso) return; // mantém o texto do Figma
    var dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    var txt = dias < 1 ? 'Alterada hoje'
      : dias < 30 ? 'Última alteração há ' + dias + (dias === 1 ? ' dia' : ' dias')
      : 'Última alteração há ' + Math.floor(dias / 30) + (Math.floor(dias / 30) === 1 ? ' mês' : ' meses');
    $('cf-senha-sub').textContent = txt;
  }

  var modalSenha = $('modal-senha');
  $('cf-senha').addEventListener('click', function () {
    $('form-senha').reset();
    $('sn-usuario').value = (getUsuario() || {}).email || '';
    erro($('sn-erro'));
    foco($('sn-atual'));
    Modal.open(modalSenha);
  });

  $('form-senha').addEventListener('submit', async function (e) {
    e.preventDefault();
    var atual = $('sn-atual').value, nova = $('sn-nova').value, conf = $('sn-conf').value;
    var errEl = $('sn-erro');
    if (!atual) return erro(errEl, 'Informe sua senha atual.');
    if (nova.length < 6) return erro(errEl, 'A nova senha precisa ter pelo menos 6 caracteres.');
    if (nova !== conf) return erro(errEl, 'As senhas não conferem.');
    if (nova === atual) return erro(errEl, 'A nova senha deve ser diferente da atual.');
    var btn = $('sn-salvar');
    btn.disabled = true;
    btn.textContent = 'Alterando...';
    try {
      await Auth.trocarSenha(atual, nova);
      U.store.set(SENHA_KEY, new Date().toISOString());
      renderSenhaSub();
      Modal.close(modalSenha, true);
      showToast('Senha alterada');
    } catch (err) {
      erro(errEl, U.erroMsg(err));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Alterar senha';
    }
  });

  // ---------- Outros ----------
  $('cf-2fa').addEventListener('click', function () { showToast('Autenticação em duas etapas em breve'); });

  $('cf-sair').addEventListener('click', function () {
    limparSessao();
    window.location.href = 'login.html';
  });

  var modalExcluir = $('modal-excluir');
  $('cf-excluir').addEventListener('click', function () {
    $('form-excluir').reset();
    $('ex-ok').disabled = true;
    erro($('ex-erro'));
    foco($('ex-conf'));
    Modal.open(modalExcluir);
  });
  $('ex-conf').addEventListener('input', function (e) {
    $('ex-ok').disabled = e.target.value.trim().toUpperCase() !== 'EXCLUIR';
  });
  // O backend ainda não tem rota para o próprio usuário excluir a conta.
  $('form-excluir').addEventListener('submit', function (e) {
    e.preventDefault();
    erro($('ex-erro'), 'A exclusão de conta ainda não está disponível pelo app. Fale com o suporte do Nexum.');
  });

  renderPerfil();
  renderPrefs();
  renderSenhaSub();
})();
