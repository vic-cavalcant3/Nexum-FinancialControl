// Comportamentos compartilhados pelas telas de login e cadastro.
// Depende de js/api.js (estaLogado) e js/toast.js (showToast).

// Placeholders: data-ph-mobile / data-ph-desktop em cada input.
(function () {
  var mq = window.matchMedia('(min-width: 1024px)');
  function sync() {
    document.querySelectorAll('[data-ph-mobile]').forEach(function (input) {
      input.placeholder = input.getAttribute(mq.matches ? 'data-ph-desktop' : 'data-ph-mobile');
    });
  }
  sync();
  if (mq.addEventListener) mq.addEventListener('change', sync);
  else mq.addListener(sync);
})();

// Mostrar / ocultar senha: <button class="toggle-password" data-target="id">
document.querySelectorAll('.toggle-password').forEach(function (btn) {
  var input = document.getElementById(btn.getAttribute('data-target'));
  btn.addEventListener('click', function () {
    var mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';
    btn.setAttribute('aria-pressed', String(mostrar));
    btn.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    btn.querySelector('.icon-show').hidden = mostrar;
    btn.querySelector('.icon-hide').hidden = !mostrar;
  });
});

// Social: ainda não disponível.
document.querySelectorAll('[data-soon]').forEach(function (b) {
  b.addEventListener('click', function () { showToast('Em breve'); });
});

// Mensagem amigável para erros da API.
// traduzirCredenciais: só no login ("inválid" => e-mail ou senha incorretos).
function mensagemErroApi(err, traduzirCredenciais) {
  var m = (err && err.message) || '';
  if (/reach|connect|failed to fetch|networkerror/i.test(m)) {
    return 'Servidor temporariamente indisponível. Tente mais tarde.';
  }
  if (traduzirCredenciais && m.indexOf('inválid') !== -1) {
    return 'E-mail ou senha incorretos.';
  }
  return m;
}
