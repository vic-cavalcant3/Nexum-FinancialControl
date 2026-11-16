# API antiga (Node/Express + Prisma + MySQL): referência

Resumo do backend Node que ficava em `backend/` e `database/`. Ele foi apagado na
reorganização do monorepo, mas o código continua no histórico do Git:

```bash
git show 9b07fe3:backend/prisma/schema.prisma
git show 9b07fe3:database/nexum_schema_final.sql
git show 9b07fe3:backend/src/controller/TransacaoController.js
```

Serve de referência para o backend novo em Java (`backend/`). O front (`frontend/js/api.js`
e `frontend/js/mock.js`) foi escrito em cima destes formatos.

## Convenções gerais

- Base: `/api`. Corpo sempre JSON.
- **Erro:** sempre `{ "erro": "mensagem" }`. O front lê `data.erro` e mostra a mensagem.
- **Autenticação (antiga):** header `x-user-id: <id_usuario>`, sem token nenhum (inseguro).
  O backend novo troca isso por `Authorization: Bearer <JWT>`.
- **Decimais:** o Prisma serializava `Decimal` como **string** (`"58.9"`). O front sempre
  converte com `Number(...)`, então número ou string funcionam.
- **Datas:** ISO 8601 (`"2026-11-16T13:15:00.000Z"`). Datas só de dia (meta) também vinham
  como ISO com hora `T00:00:00.000Z`.
- Nomes de campo em `snake_case`, iguais às colunas do banco.
- Status: em quase todo erro o Node devolvia 400 (login errado: 401). O backend novo usa o
  status correto (400, 401, 403, 404, 409, 500).

## Auth: `/api/auth`

| Método | Rota | Auth | Corpo | Resposta |
|---|---|---|---|---|
| POST | `/auth/registrar` | não | `{ nome, email, senha }` | `201 { usuario }` · e-mail repetido: `400 { erro: "E-mail já cadastrado." }` |
| POST | `/auth/login` | não | `{ email, senha }` | `200 { usuario }` · errado: `401 { erro: "Credenciais inválidas." }` |
| PUT | `/auth/perfil` | sim | `{ nome, email }` | `200 { id_usuario, nome, email }` (objeto direto, sem envelope) |
| PUT | `/auth/trocar-senha` | sim | `{ senha_atual, nova_senha }` | `200 { mensagem: "Senha alterada com sucesso." }` · `400 { erro: "Senha atual incorreta." }` |

`usuario = { id_usuario, nome, email }`. Senha com bcrypt (custo 10).

> O front (`frontend/js/auth.js`) traduz qualquer erro de login que contenha "inválid" para
> "E-mail ou senha incorretos.".

## Transações: `/api/transacoes` (todas autenticadas)

| Método | Rota | Query / corpo | Resposta |
|---|---|---|---|
| GET | `/transacoes` | `?mes=&ano=&tipo=&categoria_id=` (todos opcionais; `mes`+`ano` juntos) | `200 [Transacao + categoria]`, ordenado por `data` desc |
| GET | `/transacoes/resumo` | `?mes=&ano=` (padrão: mês atual) | `200 { receitas, despesas, saldo }` (números) |
| GET | `/transacoes/relatorio` | n/a | `200 [Transacao + categoria]`, todas do usuário, `data` asc |
| POST | `/transacoes` | `{ tipo, descricao, valor, data, categoria_id }` | `201 Transacao` (sem `categoria`) |
| PUT | `/transacoes/:id` | qualquer subconjunto dos campos acima | `200 Transacao` |
| DELETE | `/transacoes/:id` | n/a | `200 { mensagem: "Transação removida." }` |

```json
{
  "id_transacao": 12,
  "usuario_id": 1,
  "categoria_id": 3,
  "tipo": "despesa",
  "descricao": "Mercado São Luiz",
  "valor": "58.9",
  "data": "2026-11-16T13:15:00.000Z",
  "criado_em": "2026-11-16T13:15:00.000Z",
  "categoria": { "id": 3, "usuario_id": null, "nome": "Alimentação", "tipo": "despesa", "icone": "utensils" }
}
```

- `tipo`: `"receita"` ou `"despesa"` (texto livre no banco antigo).
- `categoria` pode ser `null` (categoria apagada: `ON DELETE SET NULL`).
- Filtro de mês: de `ano-mes-01 00:00` até o último dia `23:59:59` (horário do servidor).

## Categorias: `/api/categorias` (todas autenticadas)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/categorias` | n/a | `200 [Categoria]`: as do usuário **e** as globais (`usuario_id = null`), ordenadas por `nome` |
| POST | `/categorias` | `{ nome, tipo, icone }` | `201 Categoria` · duplicada: `400 { erro: "Você já tem uma categoria com esse nome e tipo." }` |
| DELETE | `/categorias/:id` | n/a | `200 { mensagem: "Categoria removida." }` (só as do próprio usuário) |

```json
{ "id": 3, "usuario_id": null, "nome": "Alimentação", "tipo": "despesa", "icone": "utensils" }
```

Atenção: a chave primária da categoria é `id` (e não `id_categoria`).

## Metas: `/api/metas` (todas autenticadas)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/metas` | n/a | `200 [Meta]`, ordenado por `data_prazo` asc |
| POST | `/metas` | `{ descricao, valor_alvo, valor_atual?, aporte_mensal?, data_inicio?, data_prazo }` | `201 Meta` (`status_meta = "em_andamento"`) |
| PUT | `/metas/:id` | subconjunto dos campos (inclui `status_meta`) | `200 Meta` |
| DELETE | `/metas/:id` | n/a | `200 { mensagem: "Meta removida." }` |

```json
{
  "id_meta": 1,
  "id_usuario": 1,
  "descricao": "Viagem para Bali",
  "valor_alvo": "5000",
  "valor_atual": "3450",
  "aporte_mensal": "600",
  "data_inicio": "2026-05-01T00:00:00.000Z",
  "data_prazo": "2026-12-01T00:00:00.000Z",
  "status_meta": "em_andamento"
}
```

Atenção: aqui a FK do usuário se chama `id_usuario` (na transação é `usuario_id`).

## Admin: `/api/admin` (autenticado + e-mail em `ADMIN_EMAILS`)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/admin/verificar-senha` | `{ senha }` (comparada com `ADMIN_PASSWORD`) | `200 { ok: true }` · `401 { erro: "Senha incorreta." }` |
| GET | `/admin/usuarios` | n/a | `200 [{ id_usuario, nome, email, telefone, ativo, criado_em, _count: { transacoes, metas } }]` |
| DELETE | `/admin/usuarios/:id` | n/a | `200 { mensagem: "Usuário removido com sucesso." }` · próprio id: `400` · inexistente: `404` |

No backend novo, o admin vem do campo `papel` (`USER`/`ADMIN`) do usuário, e não mais de
`ADMIN_EMAILS`.

## Outras

- `GET /api/health` → `{ "status": "ok" }`
- Rota inexistente → `404 { erro: "Rota não encontrada." }`
- Erro não tratado → `500 { erro: "Erro interno do servidor." }`

## Banco antigo (MySQL)

| Tabela | Colunas |
|---|---|
| `usuario` | `id_usuario` PK, `nome` (100), `email` (150, único), `senha_hash`, `telefone?`, `ativo` (bool, padrão true), `criado_em` |
| `categoria` | `id` PK, `usuario_id?` FK (null = global), `nome` (60), `tipo`, `icone?` (50); único `(usuario_id, nome, tipo)` |
| `transacao` | `id_transacao` PK, `usuario_id` FK, `categoria_id?` FK (SET NULL), `tipo` (padrão `despesa`), `descricao?` (255), `valor` DECIMAL(10,2), `data` DATETIME, `criado_em`; índices `(usuario_id, data)` e `(usuario_id, tipo)` |
| `meta_financeira` | `id_meta` PK, `id_usuario` FK, `descricao`, `valor_alvo`, `valor_atual` (0), `aporte_mensal`, `data_inicio` DATE, `data_prazo` DATE, `status_meta` (`em_andamento`) |
| `planejamento_mensal` | `id_planejamento` PK, `id_usuario` FK, `mes_referencia` DATE, receita/despesa prevista e realizada, `saldo_final` (totais do mês, **não** por categoria) |
| `divida`, `alerta`, `relatorio` | existiam no schema, mas nenhuma rota usava |

Todas as FKs para `usuario` eram `ON DELETE CASCADE`.

### Categorias padrão (globais)

SQL antigo: Salário, Renda Extra, Investimentos (receita); Alimentação, Transporte, Moradia,
Saúde, Lazer, Educação, Assinaturas, Outros (despesa).

O front atual (`frontend/js/mock.js`) usa: Alimentação, Moradia, Transporte, Lazer, Saúde,
Educação, Compras, Outros (despesa); Receita, Salário, Freelance, Investimentos (receita),
com os ícones `utensils, home, car, film, heart, book, bag, dots, wallet, briefcase, trending-up`.

## O que o front guarda só no navegador (sem rota na API antiga)

- Conta da transação → `localStorage['nexum-tx-contas']`
- Orçamento por categoria (Planejamento) → `localStorage['nexum-orcamento']`
- Ícone da meta → `localStorage['nexum-meta-icones']`
- Preferências → `localStorage['nexum-prefs']`
- Consultor IA → simulado no front (`consultorSimulado()` em `js/mock.js`)
