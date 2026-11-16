package com.nexum.api.transacao;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import com.nexum.api.IntegracaoTest;

class TransacaoControllerTest extends IntegracaoTest {

    // ------------------------------------------------------------------ CRUD

    @Test
    void criarListarEditarEExcluir() throws Exception {
        String token = novoUsuario();
        long alimentacao = categoria(token, "Alimentação");

        ResultActions criada = postJson("/api/transacoes", token, transacao("despesa", "Mercado", 58.9,
                "2026-03-10T13:15:00.000Z", alimentacao, "Conta principal"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id_transacao").isNumber())
                .andExpect(jsonPath("$.usuario_id").isNumber())
                .andExpect(jsonPath("$.tipo").value("despesa"))
                .andExpect(jsonPath("$.descricao").value("Mercado"))
                .andExpect(jsonPath("$.valor").value(58.9))
                .andExpect(jsonPath("$.data").value(startsWith("2026-03-10T13:15")))
                .andExpect(jsonPath("$.conta").value("Conta principal"))
                .andExpect(jsonPath("$.categoria_id").value(alimentacao))
                .andExpect(jsonPath("$.categoria.nome").value("Alimentação"));
        long id = lerId(criada, "$.id_transacao");

        getComToken("/api/transacoes", token)
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "1"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].categoria.nome").value("Alimentação"));

        // PUT sem "conta": mantém a conta atual
        putJson("/api/transacoes/" + id, token, transacao("despesa", "Mercado São Luiz", 60, "2026-03-11", alimentacao, null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.descricao").value("Mercado São Luiz"))
                .andExpect(jsonPath("$.valor").value(60.0))
                .andExpect(jsonPath("$.data").value(startsWith("2026-03-11")))
                .andExpect(jsonPath("$.conta").value("Conta principal"));

        // Sem categoria também pode
        putJson("/api/transacoes/" + id, token, transacao("despesa", "Mercado", 60, "2026-03-11", null, null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categoria").doesNotExist());

        deleteComToken("/api/transacoes/" + id, token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagem").value("Transação removida."));
        getComToken("/api/transacoes/" + id, token).andExpect(status().isNotFound());
        getComToken("/api/transacoes", token).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void validacoesDevolvem400() throws Exception {
        String token = novoUsuario();
        long salario = categoria(token, "Salário");

        postJson("/api/transacoes", token, transacao("despesa", "X", 0, "2026-03-10", null, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O valor deve ser maior que zero."));
        postJson("/api/transacoes", token, transacao("despesa", "X", -5, "2026-03-10", null, null))
                .andExpect(status().isBadRequest());
        postJson("/api/transacoes", token, transacao("despesa", "X", 10, null, null, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe a data."));
        postJson("/api/transacoes", token, transacao("despesa", "X", 10, "10/03/2026", null, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Data inválida: use o formato AAAA-MM-DD."));
        postJson("/api/transacoes", token, transacao("transferencia", "X", 10, "2026-03-10", null, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Tipo inválido: use receita ou despesa."));
        postJson("/api/transacoes", token, mapa("tipo", "despesa", "valor", "dez", "data", "2026-03-10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Valor inválido no campo valor."));
        // Categoria de receita numa despesa
        postJson("/api/transacoes", token, transacao("despesa", "X", 10, "2026-03-10", salario, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A categoria Salário é de receita: escolha uma categoria de despesa."));
        // Categoria que não existe
        postJson("/api/transacoes", token, transacao("despesa", "X", 10, "2026-03-10", 999999, null))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Categoria não encontrada."));
        getComToken("/api/transacoes?mes=13&ano=2026", token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Mês inválido: use um número de 1 a 12."));
    }

    @Test
    void dadosDeOutroUsuarioDevolvem404() throws Exception {
        String dono = novoUsuario();
        String intruso = novoUsuario();
        long id = lerId(postJson("/api/transacoes", dono,
                transacao("despesa", "Aluguel", 1200, "2026-03-05", categoria(dono, "Moradia"), null)), "$.id_transacao");

        getComToken("/api/transacoes/" + id, intruso)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Transação não encontrada."));
        putJson("/api/transacoes/" + id, intruso, transacao("despesa", "Hack", 1, "2026-03-05", null, null))
                .andExpect(status().isNotFound());
        deleteComToken("/api/transacoes/" + id, intruso).andExpect(status().isNotFound());
        getComToken("/api/transacoes", intruso).andExpect(jsonPath("$", hasSize(0)));

        // Categoria criada por outro usuário também não pode ser usada
        long categoriaDoDono = lerId(postJson("/api/categorias", dono, mapa("nome", "Pets", "tipo", "despesa")), "$.id");
        postJson("/api/transacoes", intruso, transacao("despesa", "X", 10, "2026-03-10", categoriaDoDono, null))
                .andExpect(status().isNotFound());

        // Continua intacta para o dono
        getComToken("/api/transacoes/" + id, dono)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.descricao").value("Aluguel"));
    }

    // ------------------------------------------------------------------ filtros

    @Test
    void filtrosEPaginacao() throws Exception {
        String token = novoUsuario();
        long lazer = categoria(token, "Lazer");
        long salario = categoria(token, "Salário");
        postJson("/api/transacoes", token, transacao("despesa", "Cinema", 40, "2026-02-10", lazer, "Cartão de crédito"));
        postJson("/api/transacoes", token, transacao("despesa", "Show no parque", 450, "2026-03-12", lazer, "Conta principal"));
        postJson("/api/transacoes", token, transacao("receita", "Salário março", 6800, "2026-03-05", salario, "Conta principal"));
        postJson("/api/transacoes", token, transacao("despesa", "Padaria", 12, "2026-03-20", null, "Conta principal"));

        // Ordem: data desc
        getComToken("/api/transacoes", token)
                .andExpect(jsonPath("$[*].descricao", contains("Padaria", "Show no parque", "Salário março", "Cinema")));
        getComToken("/api/transacoes?mes=3&ano=2026", token)
                .andExpect(jsonPath("$", hasSize(3)));
        getComToken("/api/transacoes?ano=2026&tipo=receita", token)
                .andExpect(jsonPath("$[*].descricao", contains("Salário março")));
        getComToken("/api/transacoes?categoria=lazer", token)
                .andExpect(jsonPath("$[*].descricao", contains("Show no parque", "Cinema")));
        getComToken("/api/transacoes?categoria_id=" + lazer + "&mes=2&ano=2026", token)
                .andExpect(jsonPath("$[*].descricao", contains("Cinema")));
        getComToken("/api/transacoes?conta=Cartão de crédito", token)
                .andExpect(jsonPath("$[*].descricao", contains("Cinema")));
        getComToken("/api/transacoes?busca=PARQUE", token)
                .andExpect(jsonPath("$[*].descricao", contains("Show no parque")));
        getComToken("/api/transacoes?busca=100%", token)
                .andExpect(jsonPath("$", hasSize(0)));

        // Paginação: página 2 de 3 itens por página
        getComToken("/api/transacoes?pagina=2&tamanho=3", token)
                .andExpect(header().string("X-Total-Count", "4"))
                .andExpect(jsonPath("$[*].descricao", contains("Cinema")));
        getComToken("/api/transacoes?pagina=0", token).andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------------ resumo e relatório

    @Test
    void resumoDoMesComSaldoAcumulado() throws Exception {
        String token = novoUsuario();
        postJson("/api/transacoes", token, transacao("receita", "Salário fev", 500, "2025-02-05", null, null));
        postJson("/api/transacoes", token, transacao("receita", "Salário mar", 1000, "2025-03-05", null, null));
        postJson("/api/transacoes", token, transacao("despesa", "Aluguel", 300, "2025-03-10", null, null));
        // 31/03 às 23:30 em São Paulo = 01/04 em UTC: ainda é março para o usuário.
        postJson("/api/transacoes", token, transacao("despesa", "Pizza", 50, "2025-03-31T23:30:00-03:00", null, null));
        postJson("/api/transacoes", token, transacao("despesa", "Abril", 70, "2025-04-02", null, null));

        getComToken("/api/transacoes/resumo?mes=3&ano=2025", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mes").value(3))
                .andExpect(jsonPath("$.ano").value(2025))
                .andExpect(jsonPath("$.receitas").value(1000.0))
                .andExpect(jsonPath("$.despesas").value(350.0))
                .andExpect(jsonPath("$.economias").value(650.0))
                .andExpect(jsonPath("$.saldo").value(1150.0)); // 500 + 1000 - 300 - 50

        getComToken("/api/transacoes/resumo?mes=1&ano=2025", token)
                .andExpect(jsonPath("$.receitas").value(0.0))
                .andExpect(jsonPath("$.saldo").value(0.0));
    }

    @Test
    void relatorioPorMesEPorCategoria() throws Exception {
        String token = novoUsuario();
        long moradia = categoria(token, "Moradia");
        long lazer = categoria(token, "Lazer");
        postJson("/api/transacoes", token, transacao("receita", "Salário", 1000, "2025-01-05", null, null));
        postJson("/api/transacoes", token, transacao("despesa", "Aluguel", 600, "2025-01-10", moradia, null));
        postJson("/api/transacoes", token, transacao("despesa", "Cinema", 100, "2025-03-10", lazer, null));
        postJson("/api/transacoes", token, transacao("despesa", "Feira", 300, "2025-03-11", null, null));
        postJson("/api/transacoes", token, transacao("despesa", "Fora do período", 999, "2024-12-31", lazer, null));

        getComToken("/api/transacoes/relatorio?meses=3&mes=3&ano=2025", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meses").value(3))
                .andExpect(jsonPath("$.total_receitas").value(1000.0))
                .andExpect(jsonPath("$.total_despesas").value(1000.0))
                .andExpect(jsonPath("$.economias").value(0.0))
                .andExpect(jsonPath("$.por_mes", hasSize(3)))
                .andExpect(jsonPath("$.por_mes[*].mes", contains(1, 2, 3)))
                .andExpect(jsonPath("$.por_mes[0].receitas").value(1000.0))
                .andExpect(jsonPath("$.por_mes[0].despesas").value(600.0))
                .andExpect(jsonPath("$.por_mes[1].despesas").value(0.0))
                .andExpect(jsonPath("$.por_mes[2].economias").value(-400.0))
                .andExpect(jsonPath("$.por_categoria[*].nome", contains("Moradia", "Sem categoria", "Lazer")))
                .andExpect(jsonPath("$.por_categoria[0].total").value(600.0))
                .andExpect(jsonPath("$.por_categoria[0].percentual").value(60.0))
                .andExpect(jsonPath("$.por_categoria[0].icone").value("home"))
                .andExpect(jsonPath("$.por_categoria[1].categoria_id").doesNotExist());

        getComToken("/api/transacoes/relatorio?meses=30", token)
                .andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------------ utilitários

    /** Id de uma categoria padrão pelo nome. */
    private long categoria(String token, String nome) throws Exception {
        List<Number> ids = ler(getComToken("/api/categorias", token), "$[?(@.nome == '" + nome + "')].id");
        return ids.getFirst().longValue();
    }

    private static Object transacao(String tipo, String descricao, Number valor, String data, Number categoriaId,
                                    String conta) {
        return mapa("tipo", tipo, "descricao", descricao, "valor", valor, "data", data,
                "categoria_id", categoriaId, "conta", conta);
    }
}
