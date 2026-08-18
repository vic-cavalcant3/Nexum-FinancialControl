const API_URL = 'https://nexum-financialcontrol.onrender.com/api';

function getUsuarioId() {
  return localStorage.getItem('nexum_usuario_id');
}

function getUsuario() {
  const u = localStorage.getItem('nexum_usuario');
  return u ? JSON.parse(u) : null;
}

function salvarSessao(usuario) {
  localStorage.setItem('nexum_usuario_id', usuario.id_usuario);
  localStorage.setItem('nexum_usuario', JSON.stringify(usuario));
}

function limparSessao() {
  localStorage.removeItem('nexum_usuario_id');
  localStorage.removeItem('nexum_usuario');
}

function estaLogado() {
  return !!getUsuarioId();
}

function redirecionarSeNaoLogado() {
  if (!estaLogado()) {
    window.location.href = 'login.html';
  }
}

async function apiFetch(endpoint, options = {}) {
  const usuarioId = getUsuarioId();
  const headers = {
    'Content-Type': 'application/json',
    ...(usuarioId ? { 'x-user-id': usuarioId } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json();

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
  listarUsuarios: () => apiFetch('/admin/usuarios'),
  deletarUsuario: (id) => apiFetch(`/admin/usuarios/${id}`, { method: 'DELETE' })
};

// Metas
const Metas = {
  listar: () => apiFetch('/metas'),
  criar: (dados) => apiFetch('/metas', { method: 'POST', body: JSON.stringify(dados) }),
  atualizar: (id, dados) => apiFetch(`/metas/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  deletar: (id) => apiFetch(`/metas/${id}`, { method: 'DELETE' })
};
