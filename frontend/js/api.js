// URL da API: rodando local (localhost / 127.0.0.1) usa o backend Java local;
// no deploy usa o backend no Render.
// Obs.: em localhost o js/mock.js liga sozinho. Para usar o backend local de verdade, abra com ?mock=0.
const API_URL_LOCAL = 'http://localhost:8080/api';
const API_URL_PROD = 'https://nexum-api-s83b.onrender.com/api';
const API_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname) ? API_URL_LOCAL : API_URL_PROD;

const TOKEN_KEY = 'nexum_token';

// Rotas em que 401 é só "e-mail ou senha errados", não sessão vencida.
const ROTAS_SEM_SESSAO = ['/auth/login', '/auth/registrar'];

// Login e cadastro esperam até 150 s: no plano grátis do Render o servidor dorme sem acesso
// e pode levar 1-2 minutos para acordar. As outras rotas não têm limite próprio.
const TIMEOUT_AUTH_MS = 150000;

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

  // options.timeout (ms) é opcional: passado esse tempo, a requisição é cancelada.
  const { timeout, ...opcoes } = options;
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opcoes.headers || {})
  };

  const controle = timeout ? new AbortController() : null;
  const timer = controle ? setTimeout(() => controle.abort(), timeout) : null;
  let res;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      ...opcoes,
      headers,
      ...(controle ? { signal: controle.signal } : {})
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('O servidor demorou demais para responder. Tente de novo em instantes.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  // Resposta sem JSON (ex.: página de erro do Render enquanto o servidor sobe) vira {}.
  const data = await res.json().catch(() => ({}));

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
    body: JSON.stringify({ email, senha }),
    timeout: TIMEOUT_AUTH_MS
  }),
  registrar: (nome, email, senha) => apiFetch('/auth/registrar', {
    method: 'POST',
    body: JSON.stringify({ nome, email, senha }),
    timeout: TIMEOUT_AUTH_MS
  }),
  atualizarPerfil: (nome, email) => apiFetch('/auth/perfil', {
    method: 'PUT',
    body: JSON.stringify({ nome, email })
  }),
  trocarSenha: (senha_atual, nova_senha) => apiFetch('/auth/trocar-senha', {
    method: 'PUT',
    body: JSON.stringify({ senha_atual, nova_senha })
  }),
  // { id_usuario, nome, email, papel } do dono do token
  me: () => apiFetch('/auth/me')
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
// Categoria: { id, usuario_id, nome, tipo, icone, descricao, padrao }
const Categorias = {
  listar: () => apiFetch('/categorias'),
  // criar({ nome, tipo, icone, descricao }) ou criar(nome, tipo, icone)
  criar: (nomeOuObj, tipo, icone) => {
    const dados = typeof nomeOuObj === 'object'
      ? nomeOuObj
      : { nome: nomeOuObj, tipo, icone };
    return apiFetch('/categorias', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  },
  // dados: { nome, descricao, icone } (o tipo não muda). 403 padrão · 404 · 409 nome repetido
  atualizar: (id, dados) => apiFetch(`/categorias/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados)
  }),
  // 409 se houver transações usando a categoria
  deletar: (id) => apiFetch(`/categorias/${id}`, { method: 'DELETE' })
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

// Consultor IA (pages/consultor.html). A chave da Anthropic fica só no backend.
// Sem chave no servidor: 503 "Consultor IA indisponível no momento.".
const Consultor = {
  // [{ id, titulo (null até a 1ª pergunta), atualizado_em }], mais recentes primeiro
  listarConversas: () => apiFetch('/consultor/conversas'),
  criarConversa: () => apiFetch('/consultor/conversas', { method: 'POST', body: '{}' }),
  // { id, titulo, atualizado_em, mensagens: [{ id, papel: 'USER'|'ASSISTANT', conteudo, criado_em }] }
  buscarConversa: (id) => apiFetch(`/consultor/conversas/${id}`),
  apagarConversa: (id) => apiFetch(`/consultor/conversas/${id}`, { method: 'DELETE' }),
  // { pergunta, resposta, conversa, uso: { usadas_hoje, limite } } · 429 limite do dia · 503 IA fora do ar
  enviarMensagem: (id, texto) => apiFetch(`/consultor/conversas/${id}/mensagens`, {
    method: 'POST',
    body: JSON.stringify({ texto }),
    timeout: 90000
  }),
  // { usadas_hoje, limite }
  uso: () => apiFetch('/consultor/uso')
};

// Painel de admin (pages/admin.html). Só papel ADMIN; USER recebe 403.
const Admin = {
  // { total_usuarios, novos_ultimos_30_dias, ativos_ultimos_7_dias, total_transacoes, total_metas, cadastros_por_mes: [{ ano, mes, total }] }
  estatisticas: () => apiFetch('/admin/estatisticas'),
  // params: { busca, pagina (a partir de 0), tamanho } -> { usuarios, pagina, tamanho, total, total_paginas }
  listarUsuarios: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/admin/usuarios${q ? '?' + q : ''}`);
  },
  excluirUsuario: (id) => apiFetch(`/admin/usuarios/${id}`, { method: 'DELETE' })
};
