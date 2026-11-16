# Nexum — regras permanentes

## Estrutura (monorepo)

- `frontend/`: site estático (HTML/CSS/JS puro). `index.html`, `404.html`, `pages/`, `styles/`, `js/`, `assets/`.
  Os caminhos são relativos a `frontend/` (o deploy estático publica essa pasta).
- `backend/`: API em Java 21 + Spring Boot (Maven), PostgreSQL (Neon em produção, Docker em dev), Flyway, JWT.
  Pacote base `com.nexum.api`, organizado por funcionalidade (`auth/`, `usuario/`, `transacao/`...).
- `backend-legacy-api.md`: rotas e formatos de resposta do backend Node antigo (só consulta).

## Frontend

- O design é cópia fiel do Figma. Nunca invente cor, tamanho, espaçamento, raio ou texto. Use só os valores passados nos prompts.
- Mobile-first: o CSS base reproduz o frame mobile de 390px. Desktop a partir de `@media (min-width:1024px)`, reproduzindo o frame de 1440px.
- Desktop responsivo: os valores do Figma (fontes, paddings, larguras de componentes) são fixos e NUNCA escalam com a tela. Em monitores maiores que 1440px, o conteúdo principal fica centralizado com max-width de 1440px e o espaço extra vira margem. Entre 1024px e 1440px, use larguras fluidas (%, fr, minmax) pra nada quebrar nem gerar scroll horizontal.
- A "status bar" (9:41, sinal, bateria) dos frames mobile é só mockup do Figma. NUNCA renderizar.
- Todas as cores vêm de variáveis CSS em `frontend/styles/base/tokens.css`. Tema escuro via `[data-theme="dark"]` no `<html>`.
- Fonte Inter. Poppins só onde o prompt mandar.
- JS da API fica em `frontend/js/api.js`. Não altere a lógica dele.

## Backend

- Nada de senha, connection string real ou `JWT_SECRET` no código ou em arquivo commitado: tudo vem de variável de ambiente (`backend/.env.example` lista as variáveis).
- Erros sempre no formato `{ "erro": "mensagem em português" }`, com o status HTTP correto.
- Nomes de campo do JSON em `snake_case`, iguais aos que o front já usa (ver `backend-legacy-api.md`).
- O usuário logado vem sempre do token JWT, nunca de um id enviado pelo front.
- O banco só muda via migration Flyway nova (`V<n>__descricao.sql`). Nunca edite uma migration já aplicada.
- Sem Lombok: código explícito.
