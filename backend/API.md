# API do Nexum

Referência de todas as rotas do backend Java (`backend/`). O front (`frontend/js/api.js`)
usa exatamente estes caminhos, parâmetros e nomes de campo.

## Sumário

- [Convenções](#convenções)
- [Health](#health)
- [Auth](#auth-apiauth)
- [Categorias](#categorias-apicategorias)
- [Transações](#transações-apitransacoes)
- [Metas](#metas-apimetas)
- [Orçamento](#orçamento-apiorcamentos)
- [O que mudou em relação à API antiga (Node)](#o-que-mudou-em-relação-à-api-antiga-node)

## Convenções

| Assunto | Regra |
|---|---|
| Base | `/api`. Corpo sempre JSON (`Content-Type: application/json`). |
| Autenticação | `Authorization: Bearer <token>` (o token vem do login). Só `/api/health`, `/api/auth/login` e `/api/auth/registrar` são públicas. |
| Usuário logado | Vem **sempre** do token. Nenhuma rota aceita id de usuário do front. |
| Dado de outro usuário | Ler, editar ou apagar um registro que não é seu → `404`, como se ele não existisse. |
| Erros | Sempre `{ "erro": "mensagem em português" }`. |
| Status | `200` ok · `201` criado · `400` dados inválidos · `401` sem token / token inválido ou vencido · `403` sem permissão · `404` não encontrado · `409` conflito · `500` erro interno. |
| Nomes de campo | `snake_case` (`id_usuario`, `valor_alvo`, `categoria_id`). |
| Dinheiro | Número com 2 casas (`58.90`). No banco é `NUMERIC(12,2)`; no Java, `BigDecimal`. |
| Datas | Só dia: `"2026-11-16"`. Com hora: ISO 8601 em UTC (`"2026-11-16T13:15:00Z"`). |
| Tipo | `"receita"` ou `"despesa"` (minúsculo; a entrada aceita maiúsculo). |
| "O mês" | Calculado no fuso dos usuários (`APP_TIMEZONE`, padrão `America/Sao_Paulo`), não em UTC. Uma despesa às 23h30 de 31/03 em São Paulo é de março. |
| `?mes=&ano=` | Sem os dois: mês atual. Só `mes`: ano atual. `mes` de 1 a 12. |

Mensagens de validação comuns: `"Informe o nome da meta."`, `"O valor deve ser maior que zero."`,
`"Valor inválido no campo data_prazo."` (tipo errado no JSON), `"Mês inválido: use um número de 1 a 12."`.

## Health

| Método | Rota | Resposta |
|---|---|---|
| GET | `/api/health` | `200 {"status":"ok"}` (público, não toca no banco: é o Health Check do Render) |

## Auth: `/api/auth`

| Método | Rota | Auth | Corpo | Resposta |
|---|---|---|---|---|
| POST | `/auth/registrar` | não | `{ nome, email, senha }` | `201 { usuario }` · `409 "E-mail já cadastrado"` |
| POST | `/auth/login` | não | `{ email, senha }` | `200 { token, usuario }` · `401 "E-mail ou senha inválidos"` |
| GET | `/auth/me` | sim | n/a | `200 usuario` |
| PUT | `/auth/perfil` | sim | `{ nome, email }` | `200 usuario` · `409 "E-mail já cadastrado"` |
| PUT | `/auth/trocar-senha` | sim | `{ senha_atual, nova_senha }` | `200 { mensagem }` · `400 "Senha atual incorreta."` |

```json
{ "id_usuario": 1, "nome": "Maria Silva", "email": "maria@exemplo.com" }
```

- E-mail é salvo em minúsculas. Senha: 6 a 72 caracteres, guardada com BCrypt.
- Token JWT com validade de `JWT_EXPIRATION_HOURS` (padrão 168 h = 7 dias). Guarda o id do
  usuário: trocar o e-mail não invalida o token.
- 401 vem com o motivo: `"Autenticação necessária."`, `"Token inválido."`,
  `"Sessão expirada. Faça login novamente."`.

## Categorias: `/api/categorias`

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/categorias` | n/a | `200 [Categoria]`: as padrão + as do usuário, por nome |
| POST | `/categorias` | `{ nome, tipo, icone? }` | `201 Categoria` · `409` nome repetido |
| DELETE | `/categorias/{id}` | n/a | `200 { mensagem: "Categoria removida." }` |

```json
{ "id": 3, "usuario_id": null, "nome": "Alimentação", "tipo": "despesa", "icone": "utensils", "padrao": true }
```

- `usuario_id: null` / `padrao: true` = categoria padrão (vem da migration V2).
- **POST:** `409 "Você já tem uma categoria com esse nome e tipo."` também quando o nome é
  igual ao de uma padrão (sem diferenciar maiúsculas). Mesmo nome em outro tipo pode.
- **DELETE:**
  - padrão: `403 "Categorias padrão não podem ser excluídas."`;
  - de outro usuário: `404 "Categoria não encontrada."`;
  - com transações: `409 "Não dá para excluir a categoria \"Pets\": 3 transações usam ela. Troque a categoria dessas transações ou exclua-as antes."`;
  - os limites de orçamento da categoria são apagados junto.
- Atenção: a chave da categoria se chama `id` (e não `id_categoria`).

Categorias padrão: Alimentação (`utensils`), Moradia (`home`), Transporte (`car`), Lazer (`film`),
Saúde (`heart`), Educação (`book`), Compras (`bag`), Outros (`dots`) de despesa; Receita e
Salário (`wallet`), Freelance (`briefcase`), Investimentos (`trending-up`) de receita.

## Transações: `/api/transacoes`

| Método | Rota | Query / corpo | Resposta |
|---|---|---|---|
| GET | `/transacoes` | filtros abaixo, todos opcionais | `200 [Transacao]`, `data` desc · header `X-Total-Count` |
| GET | `/transacoes/{id}` | n/a | `200 Transacao` · `404` |
| POST | `/transacoes` | `TransacaoRequest` | `201 Transacao` |
| PUT | `/transacoes/{id}` | `TransacaoRequest` | `200 Transacao` · `404` |
| DELETE | `/transacoes/{id}` | n/a | `200 { mensagem: "Transação removida." }` · `404` |
| GET | `/transacoes/resumo` | `?mes=&ano=` | `200 Resumo` |
| GET | `/transacoes/relatorio` | `?meses=6&mes=&ano=` | `200 Relatorio` |

### Filtros do GET `/transacoes`

| Parâmetro | Exemplo | Efeito |
|---|---|---|
| `mes`, `ano` | `?mes=11&ano=2026` | só o mês (no fuso do usuário). Só `ano`: o ano inteiro. |
| `tipo` | `?tipo=despesa` | `receita` ou `despesa` |
| `categoria_id` | `?categoria_id=3` | pelo id |
| `categoria` | `?categoria=Lazer` ou `?categoria=3` | pelo nome (sem diferenciar maiúsculas) ou id |
| `conta` | `?conta=Cartão de crédito` | conta exata (sem diferenciar maiúsculas) |
| `busca` | `?busca=mercado` | trecho da descrição |
| `pagina`, `tamanho` | `?pagina=2&tamanho=20` | paginação (página começa em 1; tamanho padrão 50, máx. 500) |

Sem `pagina`/`tamanho` vêm **todas** as transações (é o que o front faz hoje). A resposta é
sempre um array; o total de itens vai no header `X-Total-Count`.

### TransacaoRequest (POST e PUT)

```json
{
  "tipo": "despesa",
  "descricao": "Mercado São Luiz",
  "valor": 58.9,
  "data": "2026-11-16T13:15:00.000Z",
  "categoria_id": 3,
  "conta": "Conta principal"
}
```

| Campo | Regras |
|---|---|
| `tipo` | obrigatório: `receita` ou `despesa` |
| `valor` | obrigatório, maior que zero. O sinal vem do `tipo`. |
| `data` | obrigatória: `"2026-11-16"` (vira meio-dia no fuso do usuário) ou ISO completo com fuso |
| `categoria_id` | opcional (`null` = sem categoria). Se vier, precisa existir, ser do usuário ou padrão (senão `404`) e ser do mesmo tipo (senão `400 "A categoria Salário é de receita: escolha uma categoria de despesa."`) |
| `descricao` | opcional, até 255 |
| `conta` | opcional, até 30. No PUT, se não vier, mantém a atual. |

O PUT substitui os campos (o front sempre manda o objeto inteiro).

### Transacao

```json
{
  "id_transacao": 12,
  "usuario_id": 1,
  "categoria_id": 3,
  "tipo": "despesa",
  "descricao": "Mercado São Luiz",
  "valor": 58.90,
  "data": "2026-11-16T13:15:00Z",
  "conta": "Conta principal",
  "criado_em": "2026-11-16T13:15:02.123Z",
  "categoria": { "id": 3, "usuario_id": null, "nome": "Alimentação", "tipo": "despesa", "icone": "utensils", "padrao": true }
}
```

`categoria` vem `null` quando a transação não tem categoria.

### Resumo: GET `/transacoes/resumo?mes=11&ano=2026`

```json
{ "mes": 11, "ano": 2026, "receitas": 9120.00, "despesas": 4680.00, "economias": 4440.00, "saldo": 18450.00 }
```

- `receitas` / `despesas`: totais do mês.
- `economias`: receitas - despesas do mês (pode ser negativo).
- `saldo`: saldo **acumulado** de todas as transações até o fim do mês ("Saldo total" da dashboard).

### Relatório: GET `/transacoes/relatorio?meses=6`

`meses`: 1 a 24 (padrão 6), terminando no mês atual (ou em `mes`/`ano`, se vierem).

```json
{
  "meses": 6,
  "total_receitas": 51492.00,
  "total_despesas": 27820.00,
  "economias": 23672.00,
  "por_mes": [
    { "mes": 6, "ano": 2026, "receitas": 8500.00, "despesas": 5540.00, "economias": 2960.00 },
    "... um item por mês, do mais antigo ao atual (meses sem movimento vêm zerados)"
  ],
  "por_categoria": [
    { "categoria_id": 2, "nome": "Moradia", "icone": "home", "total": 8600.00, "percentual": 30.9 },
    { "categoria_id": null, "nome": "Sem categoria", "icone": null, "total": 120.00, "percentual": 0.4 }
  ]
}
```

- `por_mes`: gráfico "Receitas vs Despesas".
- `por_categoria`: só **despesas**, da maior para a menor (ranking "Onde seu dinheiro mais
  foi"). `percentual` é a porcentagem do total de despesas do período.

## Metas: `/api/metas`

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/metas` | n/a | `200 [Meta]`, da data prevista mais próxima para a mais distante |
| GET | `/metas/{id}` | n/a | `200 Meta` · `404` |
| POST | `/metas` | `MetaRequest` | `201 Meta` |
| PUT | `/metas/{id}` | `MetaRequest` | `200 Meta` · `404` |
| DELETE | `/metas/{id}` | n/a | `200 { mensagem: "Meta removida." }` · `404` |

### MetaRequest (campos do modal "Nova meta")

```json
{
  "descricao": "Viagem para Bali",
  "valor_alvo": 5000,
  "valor_atual": 3450,
  "aporte_mensal": 600,
  "data_inicio": "2026-06-01",
  "data_prazo": "2026-12-01",
  "status_meta": "em_andamento",
  "icone": "viagem"
}
```

| Campo | No modal | Regras |
|---|---|---|
| `descricao` | Nome | obrigatório, até 255 |
| `valor_alvo` | Valor objetivo | obrigatório, maior que zero |
| `valor_atual` | Valor já guardado | opcional, `>= 0` (POST: 0) |
| `data_prazo` | Data prevista | obrigatória, `AAAA-MM-DD`, não pode ser antes de `data_inicio` |
| `icone` | Ícone | opcional: `viagem`, `reserva`, `consumo`, `imovel`, `estudo`, `veiculo`. `""` remove. |
| `aporte_mensal` | (calculado pelo front) | opcional, `>= 0` (POST: 0) |
| `data_inicio` | (hoje) | opcional (POST: hoje) |
| `status_meta` | n/a | opcional: `em_andamento` (padrão), `concluida`, `cancelada` |

No PUT, campo opcional que não vier (`null`) mantém o valor atual.

### Meta

```json
{
  "id_meta": 1,
  "id_usuario": 1,
  "descricao": "Viagem para Bali",
  "valor_alvo": 5000.00,
  "valor_atual": 3450.00,
  "aporte_mensal": 600.00,
  "data_inicio": "2026-06-01",
  "data_prazo": "2026-12-01",
  "status_meta": "em_andamento",
  "icone": "viagem",
  "percentual": 69
}
```

- `percentual`: `valor_atual / valor_alvo`, inteiro de 0 a 100, arredondado para baixo
  (99,9% vira 99%; passou do objetivo, fica em 100).
- Atenção: na meta, o dono se chama `id_usuario` (na transação é `usuario_id`). É o nome que o
  front já usava.

## Orçamento: `/api/orcamentos`

Planejamento mensal: um limite por categoria de despesa, por mês.

| Método | Rota | Query / corpo | Resposta |
|---|---|---|---|
| GET | `/orcamentos` | `?mes=&ano=` (padrão: mês atual) | `200 Orcamento` |
| PUT | `/orcamentos` | `{ mes, ano, limites: [{ categoria_id, limite }] }` | `200 Orcamento` |

### GET `/orcamentos?mes=11&ano=2026`

```json
{
  "mes": 11,
  "ano": 2026,
  "herdado": false,
  "total_orcado": 4700.00,
  "total_gasto": 4680.00,
  "categorias": [
    { "categoria_id": 2, "nome": "Moradia", "icone": "home", "limite": 1500.00, "gasto": 1500.00, "percentual": 100 },
    { "categoria_id": 1, "nome": "Alimentação", "icone": "utensils", "limite": 900.00, "gasto": 980.00, "percentual": 109 },
    { "categoria_id": 7, "nome": "Compras", "icone": "bag", "limite": null, "gasto": 150.00, "percentual": null }
  ]
}
```

- `categorias`: **todas** as categorias de despesa do usuário (padrão + dele). Primeiro as
  com limite (maior limite antes), depois as sem limite (`limite: null`), por nome.
  As sem limite são as que o modal "Nova categoria" oferece.
- `gasto`: despesas do mês naquela categoria. `percentual`: `gasto / limite`, inteiro,
  pode passar de 100 (`null` sem limite).
- `total_orcado`: soma dos limites. `total_gasto`: **todas** as despesas do mês, inclusive sem
  categoria ou em categoria sem limite. A tela soma essa diferença no card "Outros".
- `herdado: true`: o mês ainda não tem orçamento próprio e os limites vieram do último mês
  planejado antes dele. O orçamento continua de um mês para o outro até alguém salvar.

### PUT `/orcamentos`

```json
{ "mes": 11, "ano": 2026, "limites": [ { "categoria_id": 2, "limite": 1500 }, { "categoria_id": 1, "limite": 900 } ] }
```

- Define o orçamento **inteiro** do mês: o que não estiver na lista fica sem limite naquele
  mês. Lista vazia apaga o orçamento do mês. É o que "Editar orçamento" e "Nova categoria" salvam.
- Erros:
  - limite negativo: `400 "O limite não pode ser negativo."`;
  - categoria de receita: `400 "O orçamento só aceita categorias de despesa (Salário é de receita)."`;
  - categoria repetida: `400 "A mesma categoria apareceu duas vezes no orçamento."`;
  - categoria de outro usuário: `404 "Categoria não encontrada."`.
- Responde igual ao GET, já com os gastos.

## O que mudou em relação à API antiga (Node)

O backend Node/Express + Prisma + MySQL foi apagado, mas continua no histórico do Git:

```bash
git show 9b07fe3:backend/prisma/schema.prisma
git show 9b07fe3:backend/src/controller/TransacaoController.js
```

| Antes (Node) | Agora (Java) |
|---|---|
| Header `x-user-id` (qualquer um se passava por outro usuário) | `Authorization: Bearer <JWT>` |
| Quase todo erro era `400` | Status certo (`401`, `404`, `409`...) |
| Login errado: `"Credenciais inválidas."` | `"E-mail ou senha inválidos"` (o front traduz qualquer "inválid" para "E-mail ou senha incorretos.") |
| Decimais como texto (`"58.9"`) | Números (`58.90`); o front usa `Number(...)` nos dois casos |
| Meta: `data_prazo` como `"2026-12-01T00:00:00.000Z"` | `"2026-12-01"` |
| `/resumo`: `saldo` = receitas - despesas do mês | `economias` = receitas - despesas do mês; `saldo` = acumulado até o fim do mês |
| `/relatorio`: lista de todas as transações | Totais por mês e por categoria |
| Mês calculado no fuso do servidor | No fuso dos usuários (`APP_TIMEZONE`) |
| Conta da transação, ícone da meta e orçamento só no navegador | Na API (`conta`, `icone`, `/orcamentos`). O front ainda usa o navegador como reserva para dados antigos. |
| PUT aceitava qualquer campo do corpo (`req.body` direto no banco) | Só os campos do DTO, validados |
| `/api/admin/*` (senha fixa + `ADMIN_EMAILS`) | Ainda não existe. O usuário já tem `papel` (`USER`/`ADMIN`) para isso. |
| Tabelas `divida`, `alerta`, `relatorio`, `planejamento_mensal` (sem rota) | Não existem. O orçamento por categoria substitui o `planejamento_mensal`. |
