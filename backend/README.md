# Nexum API (backend)

API REST do Nexum em **Java 21 + Spring Boot 4**, com **PostgreSQL** (Neon em produção,
Docker em desenvolvimento), **Flyway** para as migrations e **JWT** para autenticação.

## Sumário

- [Estrutura](#estrutura)
- [Pré-requisitos](#pré-requisitos)
- [Rodar local](#rodar-local)
- [Testes](#testes)
- [Rotas prontas](#rotas-prontas)
- [Banco e migrations](#banco-e-migrations)
- [Deploy no Render](#deploy-no-render)
- [Problemas comuns](#problemas-comuns)

## Estrutura

```
backend/
├── pom.xml                 # dependências (Maven)
├── mvnw, mvnw.cmd          # Maven Wrapper: não precisa instalar o Maven
├── .env.example            # modelo das variáveis de ambiente
├── docker-compose.yml      # Postgres 16 para desenvolvimento
├── Dockerfile              # imagem usada no Render
└── src/
    ├── main/java/com/nexum/api/
    │   ├── config/         # CORS e regras do Spring Security
    │   ├── security/       # JWT: JwtService, JwtAuthFilter, UsuarioDetailsService
    │   ├── common/         # erros ({ "erro": ... }), health, DTOs comuns
    │   ├── auth/           # registrar, login, me, perfil, trocar senha
    │   ├── usuario/        # entidade Usuario + repository
    │   └── transacao/, categoria/, meta/, orcamento/   # próximas etapas
    ├── main/resources/
    │   ├── application.yml # configuração (lê tudo de variáveis de ambiente)
    │   └── db/migration/   # V1__..., V2__... (Flyway)
    └── test/java/...       # testes (Postgres real via Testcontainers)
```

O código é organizado **por funcionalidade**: tudo de autenticação fica em `auth/`, tudo de
transação vai ficar em `transacao/`, e assim por diante.

## Pré-requisitos

- **JDK 21 ou mais novo** (`java -version`). O projeto compila para Java 21.
- **Docker Desktop** rodando (para o Postgres local e para os testes).
- Não precisa instalar o Maven: use o `./mvnw` (Windows: `mvnw.cmd`).

> No Windows use o **Git Bash** para os comandos abaixo. No PowerShell/CMD troque
> `./mvnw` por `.\mvnw.cmd`.

## Rodar local

Todos os comandos são **de dentro da pasta `backend/`**.

**1. Crie o `.env`** a partir do modelo e preencha:

```bash
cp .env.example .env
```

- `DB_PASSWORD`: qualquer senha (é a do Postgres local que o compose vai criar).
- `JWT_SECRET`: gere uma com `openssl rand -base64 48` (mínimo de 32 caracteres).

O `.env` não vai para o Git. A API lê esse arquivo sozinha (`spring.config.import` no
`application.yml`), e o docker compose também.

**2. Suba o Postgres:**

```bash
docker compose up -d
```

**3. Rode a API:**

```bash
./mvnw spring-boot:run
```

Na primeira vez o Flyway cria as tabelas. Quando aparecer `Started NexumApiApplication`:

```bash
curl http://localhost:8080/api/health
# {"status":"ok"}
```

**4. Teste o login** (Git Bash):

```bash
curl -X POST http://localhost:8080/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria","email":"maria@exemplo.com","senha":"segredo123"}'

curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@exemplo.com","senha":"segredo123"}'
# {"token":"eyJ...","usuario":{...}}

curl http://localhost:8080/api/auth/me -H "Authorization: Bearer COLE_O_TOKEN_AQUI"
```

**Front apontando para a API local:** abra o front pelo Live Server
(`http://127.0.0.1:5500/frontend/...`). Em localhost o `js/mock.js` liga sozinho; para usar
a API de verdade, abra uma página com `?mock=0` (ex.: `pages/login.html?mock=0`).

**Parar:** `Ctrl+C` na API e `docker compose down` (os dados continuam no volume).
Para apagar o banco local e começar do zero: `docker compose down -v`.

## Testes

```bash
./mvnw test
```

Os testes sobem a aplicação inteira e um **Postgres 16 descartável** em container
(Testcontainers), rodam as migrations e testam as rotas. Precisa do Docker rodando, mas não
precisa do `.env` nem do `docker compose up`. O `JWT_SECRET` dos testes é gerado na hora.

## Rotas prontas

| Método | Rota | Auth | Corpo | Resposta |
|---|---|---|---|---|
| GET | `/api/health` | não | n/a | `200 {"status":"ok"}` |
| POST | `/api/auth/registrar` | não | `{nome, email, senha}` | `201 {usuario}` · `409` e-mail já cadastrado |
| POST | `/api/auth/login` | não | `{email, senha}` | `200 {token, usuario}` · `401` e-mail ou senha inválidos |
| GET | `/api/auth/me` | sim | n/a | `200 {id_usuario, nome, email}` |
| PUT | `/api/auth/perfil` | sim | `{nome, email}` | `200 {id_usuario, nome, email}` · `409` |
| PUT | `/api/auth/trocar-senha` | sim | `{senha_atual, nova_senha}` | `200 {mensagem}` · `400` senha atual incorreta |

- **Auth = sim**: mande o header `Authorization: Bearer <token>`. Sem token, ou com token
  inválido ou vencido: `401`.
- **Todo erro** vem como `{ "erro": "mensagem em português" }`.
- JSON em `snake_case` (`id_usuario`, `senha_atual`). No Java os campos ficam em camelCase
  e o Jackson converte sozinho (`spring.jackson.property-naming-strategy`).

As rotas de transações, categorias, metas e orçamento ainda vão ser feitas. O formato
esperado pelo front está em [`../backend-legacy-api.md`](../backend-legacy-api.md).

## Banco e migrations

- As tabelas são criadas **só pelo Flyway**, com os arquivos em
  `src/main/resources/db/migration`. O Hibernate apenas confere se as entidades batem com o
  banco (`ddl-auto: validate`). Se não baterem, a API nem sobe e diz o que está diferente.
- **Nunca edite uma migration que já rodou** (o Flyway guarda um checksum e recusa).
  Para mudar o banco, crie a próxima: `V3__adiciona_coluna_x.sql`.
- Dinheiro é sempre `NUMERIC(12,2)` no banco e `BigDecimal` no Java (nunca `double`).

## Deploy no Render

O Render constrói a imagem a partir do `Dockerfile` desta pasta.

### 1. Banco no Neon

1. Crie um projeto em [neon.tech](https://neon.tech) (plano Free).
2. Em **Connect**, copie a connection string. Ela vem assim:
   `postgresql://USER:SENHA@HOST/neondb?sslmode=require`
3. Converta para as 3 variáveis do Java (a explicação completa está no `.env.example`):
   ```
   DB_URL=jdbc:postgresql://HOST/neondb?sslmode=require
   DB_USER=USER
   DB_PASSWORD=SENHA
   ```
   Use o host **direto** (sem `-pooler` no nome; desmarque *Connection pooling* no painel).
   O Flyway usa locks de sessão, que não combinam com o pooler do Neon, e a API já tem o
   próprio pool (Hikari).

O Flyway cria as tabelas no Neon sozinho no primeiro deploy.

### 2. Web Service no Render

1. **New > Web Service** e conecte este repositório do GitHub.
2. Configure:

   | Campo | Valor |
   |---|---|
   | Language / Runtime | **Docker** |
   | Branch | a branch que vai para produção |
   | Root Directory | **`backend`** |
   | Dockerfile Path | `./Dockerfile` (padrão) |
   | Instance Type | Free |
   | Health Check Path | **`/api/health`** (em *Advanced*) |

3. Em **Environment**, adicione:

   | Variável | Valor |
   |---|---|
   | `DB_URL` | `jdbc:postgresql://HOST/neondb?sslmode=require` |
   | `DB_USER` | usuário do Neon |
   | `DB_PASSWORD` | senha do Neon |
   | `JWT_SECRET` | uma chave **nova**, só de produção: `openssl rand -base64 48` |
   | `JWT_EXPIRATION_HOURS` | `168` (opcional) |
   | `CORS_ORIGINS` | `https://nexumweb.onrender.com` (URL do front, sem barra no final) |

   **Não** cadastre `PORT`: o Render define sozinho e a API usa.

4. **Create Web Service**. O primeiro build demora alguns minutos (baixa as dependências).
   Quando terminar: `https://SEU-SERVICO.onrender.com/api/health` → `{"status":"ok"}`.

### 3. Ligar o front

1. Em `frontend/js/api.js`, preencha
   `API_URL_PROD = 'https://SEU-SERVICO.onrender.com/api'`.
2. Em `frontend/js/mock.js`, troque `MOCK_NO_DEPLOY = true` para `false`.
3. O site estático do front no Render precisa publicar a pasta **`frontend`**
   (Static Site > Settings > *Publish Directory* = `frontend`, ou *Root Directory* = `frontend`).

### Plano grátis: o que esperar

- O serviço **dorme depois de ~15 min sem acesso**. A primeira requisição depois disso
  demora (a JVM precisa subir de novo, podendo levar 1 minuto ou mais).
- 512 MB de RAM: o `Dockerfile` já limita a heap a 75% disso (`-XX:MaxRAMPercentage=75`).
- O pool de conexões fica em no máximo 5 e solta as conexões paradas, para o Neon poder
  "dormir" e não gastar as horas grátis.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `Defina a variável de ambiente JWT_SECRET` | Falta `JWT_SECRET` no `.env` (local) ou no Environment (Render). |
| `JWT_SECRET precisa ter pelo menos 32 caracteres` | A chave é curta: gere com `openssl rand -base64 48`. |
| `Connection refused` em `localhost:5432` | O Postgres não está rodando: `docker compose up -d`. |
| `password authentication failed` | `DB_USER`/`DB_PASSWORD` diferentes dos que criaram o volume. Rode `docker compose down -v` e suba de novo. |
| `Schema-validation: missing column ...` | A entidade Java tem um campo que o banco não tem: falta uma migration. |
| `Could not find a valid Docker environment` nos testes | O Docker Desktop não está aberto. |
| Front recebe erro de CORS | A origem do front não está em `CORS_ORIGINS` (confira `http` x `https`, porta e barra no final). |
| `./mvnw: Permission denied` | `chmod +x mvnw` (ou use `sh mvnw ...`). |
