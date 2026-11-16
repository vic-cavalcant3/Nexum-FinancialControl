// URL da API: rodando local (localhost / 127.0.0.1) usa o backend Java local;
// no deploy usa o backend no Render.
// Obs.: em localhost o js/mock.js liga sozinho. Para usar o backend local de verdade, abra com ?mock=0.
const API_URL_LOCAL = 'http://localhost:8080/api';
const API_URL_PROD = ''; // TODO: URL do backend no Render, ex.: 'https://nexum-api.onrender.com/api'
const API_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname) ? API_URL_LOCAL : API_URL_PROD;

const TOKEN_KEY = 'nexum_token';

// Rotas em que 401 é só "e-mail ou senha errados", não sessão vencida.
const ROTAS_SEM_SESSAO = ['/auth/login', '/auth/registrar'];

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUsuarioId() {
  return localStorage.getItem('nexum_usuario_id');
}

function getUsuario() {
  const u = localStorage.getItem('nexum_usuario');
  return u ? JSON.parse(u) : null;
}

// token é opcional: quem só atualiza o usuário (ex.: perfil) mantém o token atual.
function salvarSessao(usuario, token) {
  localStorage.setItem('nexum_usuario_id', usuario.id_usuario);
  localStorage.setItem('nexum_usuario', JSON.stringify(usuario));
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

function limparSessao() {
  localStorage.removeItem('nexum_usuario_id');
  localStorage.removeItem('nexum_usuario');
  localStorage.removeItem(TOKEN_KEY);
}

function estaLogado() {
  return !!getToken();
}

// login.html fica em pages/; o index.html está um nível acima.
function caminhoLogin() {
  return window.location.pathname.indexOf('/pages/') !== -1 ? 'login.html' : 'pages/login.html';
}

function redirecionarSeNaoLogado() {
  if (!estaLogado()) {
    window.location.href = caminhoLogin();
  }
}

async function apiFetch(endpoint, options = {}) {
  if (!API_URL) {
    throw new Error('URL da API não configurada (API_URL_PROD em js/api.js).');
  }

  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json();

  // Token ausente, inválido ou vencido: encerra a sessão e volta para o login.
  if (res.status === 401 && !ROTAS_SEM_SESSAO.includes(endpoint)) {
    limparSessao();
    window.location.href = caminhoLogin();
    throw new Error(data.erro || 'Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    throw new Error(data.erro || 'Erro na requisição');
  }

  return data;
}

// Auth
const Auth = {
  login: (email, senha) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha })
  }),
  registrar: (nome, email, senha) => apiFetch('/auth/registrar', {
    method: 'POST',
    body: JSON.stringify({ nome, email, senha })
  }),
  atualizarPerfil: (nome, email) => apiFetch('/auth/perfil', {
    method: 'PUT',
    body: JSON.stringify({ nome, email })
  }),
  trocarSenha: (senha_atual, nova_senha) => apiFetch('/auth/trocar-senha', {
    method: 'PUT',
    body: JSON.stringify({ senha_atual, nova_senha })
  })
};

// Transações
const Transacoes = {
  listar: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/transacoes${q ? '?' + q : ''}`);
  },
  criar: (dados) => apiFetch('/transacoes', {
    method: 'POST',
    body: JSON.stringify(dados)
  }),
  atualizar: (id, dados) => apiFetch(`/transacoes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados)
  }),
  deletar: (id) => apiFetch(`/transacoes/${id}`, { method: 'DELETE' }),
  resumo: (mes, ano) => apiFetch(`/transacoes/resumo?mes=${mes}&ano=${ano}`),
  relatorio: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/transacoes/relatorio${q ? '?' + q : ''}`);
  }
};

// Categorias
const Categorias = {
  listar: () => apiFetch('/categorias'),
  criar: (nomeOuObj, tipo, icone) => {
    const dados = typeof nomeOuObj === 'object'
      ? nomeOuObj
      : { nome: nomeOuObj, tipo, icone };
    return apiFetch('/categorias', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  },
  deletar: (id) => apiFetch(`/categorias/${id}`, { method: 'DELETE' })
};

// Admin
const Admin = {
  verificarSenha: (senha) => apiFetch('/admin/verificar-senha', {
    method: 'POST',
    body: JSON.stringify({ senha })
  }),
  listarUsuarios: () => apiFetch('/admin/usuarios'),
  deletarUsuario: (id) => apiFetch(`/admin/usuarios/${id}`, { method: 'DELETE' })
};

// Orçamento mensal por categoria (tela Planejamento)
const Orcamentos = {
  // { mes, ano, herdado, total_orcado, total_gasto, categorias: [{ categoria_id, nome, limite, gasto, ... }] }
  listar: (mes, ano) => apiFetch(`/orcamentos?mes=${mes}&ano=${ano}`),
  // limites: [{ categoria_id, limite }]: substitui o orçamento inteiro do mês
  atualizar: (mes, ano, limites) => apiFetch('/orcamentos', {
    method: 'PUT',
    body: JSON.stringify({ mes, ano, limites })
  })
};

// Metas
const Metas = {
  listar: () => apiFetch('/metas'),
  criar: (dados) => apiFetch('/metas', { method: 'POST', body: JSON.stringify(dados) }),
  atualizar: (id, dados) => apiFetch(`/metas/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  deletar: (id) => apiFetch(`/metas/${id}`, { method: 'DELETE' })
};
