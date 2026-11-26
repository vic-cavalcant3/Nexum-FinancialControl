# 🔗 Nexum

> Projeto Integrador · SENAI
> Aplicativo web de controle financeiro pessoal com foco em experiência do usuário.

---

## 📌 O que é o Nexum

O **Nexum** ajuda a pessoa a entender e organizar o próprio dinheiro:

- **Transações**: registro de receitas e despesas por categoria e conta, com busca e filtros.
- **Visão geral**: saldo, receitas, despesas, economias e fluxo de caixa dos últimos 6 meses.
- **Planejamento**: orçamento mensal por categoria, com alerta quando passa do limite.
- **Metas**: objetivos com valor, prazo e ritmo de aporte.
- **Relatórios**: receitas vs. despesas e para onde o dinheiro foi.
- **Consultor IA** e **Dicas**: sugestões a partir dos seus dados e conteúdos de educação financeira.
- **Configurações**: perfil, senha e tema claro/escuro.
- **Painel do administrador**: estatísticas de uso e gestão de usuários (só para admins).

Funciona no celular e no computador, com tema claro e escuro.

---

## 🌐 Links

| | |
|---|---|
| Site | https://nexumweb.onrender.com |
| API | https://nexum-api-s83b.onrender.com/api (saúde: [`/api/health`](https://nexum-api-s83b.onrender.com/api/health)) |
| Referência da API | [`backend/API.md`](backend/API.md) |

> Os dois serviços estão no plano grátis do Render: depois de um tempo sem acesso eles "dormem"
> e o primeiro acesso pode levar 1 a 2 minutos.

---

## 🧰 Stack

| Parte | Tecnologias |
|---|---|
| Frontend | HTML, CSS e JavaScript puros (sem framework), fonte Inter, mobile-first |
| Backend | Java 21 + Spring Boot 4 (Maven), Spring Security + JWT, Spring Data JPA, Flyway |
| Banco | PostgreSQL 16 (Neon em produção, Docker em desenvolvimento) |
| Deploy | Render (site estático + Web Service com Docker) |

---

## 📁 Estrutura de pastas

```
Nexum-FinancialControl/
├── frontend/                # Site estático (é esta pasta que vai para o deploy)
│   ├── index.html           # Splash / página inicial
│   ├── 404.html
│   ├── pages/               # Telas: login, cadastro, dashboard, transações, metas, admin...
│   ├── styles/              # CSS: base/ (tokens, componentes), layout/, pages/
│   ├── js/                  # api.js (chamadas à API), mock.js, layout.js, pages/ (JS de cada tela)
│   └── assets/              # Logo, ícones e imagens
├── backend/                 # API em Java 21 + Spring Boot + PostgreSQL
│   ├── src/main/java/com/nexum/api/   # auth/, usuario/, transacao/, categoria/, meta/, orcamento/, admin/...
│   ├── src/main/resources/db/migration/   # migrations do Flyway (V1, V2, V3...)
│   ├── API.md               # Referência de todas as rotas
│   └── README.md            # Guia completo do backend (rodar, testar, deploy)
└── docs/
    └── styleguide.html      # Guia visual dos componentes (fora do deploy)
```

---

## ▶️ Como rodar local

### 1. Backend (API)

Pré-requisitos: **JDK 21+** e **Docker Desktop** (para o Postgres). Comandos de dentro de `backend/`
(no Windows, use o Git Bash ou troque `./mvnw` por `.\mvnw.cmd`):

```bash
cd backend
cp .env.example .env          # preencha DB_PASSWORD, JWT_SECRET e (opcional) ADMIN_EMAILS
docker compose up -d          # sobe o PostgreSQL local
./mvnw spring-boot:run        # API em http://localhost:8080
```

Teste: `curl http://localhost:8080/api/health` → `{"status":"ok"}`.
Testes automatizados: `./mvnw test`. Detalhes (inclusive como rodar sem Docker) em
[`backend/README.md`](backend/README.md).

### 2. Frontend

Sirva a pasta do projeto com qualquer servidor estático na porta 5500, por exemplo a extensão
**Live Server** do VS Code, e abra `http://127.0.0.1:5500/frontend/`.

- Em `localhost` o front liga sozinho o **modo mock** (dados de teste no navegador, sem backend).
- Para usar a **API local de verdade**, abra qualquer página com `?mock=0`
  (ex.: `pages/login.html?mock=0`). A escolha fica salva; `?mock=1` volta para o mock.
- No deploy, o front usa a API do Render automaticamente.

### 3. Painel do administrador

Acesso só pela URL `pages/admin.html` (não aparece no menu). Para virar admin, coloque seu
e-mail na variável `ADMIN_EMAILS` do backend (lista separada por vírgula) e reinicie a API ou
faça login de novo. No modo mock, o usuário de teste já é admin.

---

## 👥 Equipe

Desenvolvido como parte do **Projeto Integrador** do curso de Análise e Desenvolvimento de
Sistemas — SENAI Mariano Ferraz, por:

- **Victor** Cavalcante
- **Raissa** Gouvea
- **Mari** (Mariana Paiva)

---

## 📄 Licença

Este projeto é de uso acadêmico.
