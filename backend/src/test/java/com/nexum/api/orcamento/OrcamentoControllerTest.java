package com.nexum.api.orcamento;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.nexum.api.IntegracaoTest;

class OrcamentoControllerTest extends IntegracaoTest {

    @Test
    void semOrcamentoListaAsCategoriasDeDespesaSemLimite() throws Exception {
        String token = novoUsuario();

        getComToken("/api/orcamentos?mes=3&ano=2025", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mes").value(3))
                .andExpect(jsonPath("$.ano").value(2025))
                .andExpect(jsonPath("$.herdado").value(false))
                .andExpect(jsonPath("$.total_orcado").value(0.0))
                .andExpect(jsonPath("$.total_gasto").value(0.0))
                .andExpect(jsonPath("$.categorias", hasSize(8))) // as 8 padrão de despesa
                .andExpect(jsonPath("$.categorias[*].limite", everyItem(nullValue())));
    }

    @Test
    void definirConsultarComGastosEHerdarNoMesSeguinte() throws Exception {
        String token = novoUsuario();
        long moradia = categoria(token, "Moradia");
        long alimentacao = categoria(token, "Alimentação");
        long lazer = categoria(token, "Lazer");
        despesa(token, 1200, "2025-03-05", moradia);
        despesa(token, 950, "2025-03-10", alimentacao);
        despesa(token, 100, "2025-03-12", lazer);
        despesa(token, 50, "2025-03-15", null);
        despesa(token, 999, "2025-02-15", moradia); // outro mês: não conta

        putJson("/api/orcamentos", token, mapa("mes", 3, "ano", 2025, "limites", List.of(
                mapa("categoria_id", alimentacao, "limite", 900),
                mapa("categoria_id", moradia, "limite", 1500))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.herdado").value(false))
                .andExpect(jsonPath("$.total_orcado").value(2400.0))
                .andExpect(jsonPath("$.total_gasto").value(2300.0))
                // Com limite primeiro, do maior para o menor
                .andExpect(jsonPath("$.categorias[0].nome").value("Moradia"))
                .andExpect(jsonPath("$.categorias[0].limite").value(1500.0))
                .andExpect(jsonPath("$.categorias[0].gasto").value(1200.0))
                .andExpect(jsonPath("$.categorias[0].percentual").value(80))
                .andExpect(jsonPath("$.categorias[0].icone").value("home"))
                .andExpect(jsonPath("$.categorias[1].nome").value("Alimentação"))
                .andExpect(jsonPath("$.categorias[1].percentual").value(106))
                .andExpect(jsonPath("$.categorias[?(@.nome == 'Lazer')].gasto").value(contains(100.0)))
                .andExpect(jsonPath("$.categorias[?(@.nome == 'Lazer')].limite").value(contemNull()));

        getComToken("/api/orcamentos?mes=3&ano=2025", token)
                .andExpect(jsonPath("$.total_orcado").value(2400.0));

        // Abril não tem orçamento próprio: herda o de março, com o gasto de abril (zero)
        getComToken("/api/orcamentos?mes=4&ano=2025", token)
                .andExpect(jsonPath("$.herdado").value(true))
                .andExpect(jsonPath("$.total_orcado").value(2400.0))
                .andExpect(jsonPath("$.total_gasto").value(0.0));

        // Fevereiro é anterior: não herda nada
        getComToken("/api/orcamentos?mes=2&ano=2025", token)
                .andExpect(jsonPath("$.herdado").value(false))
                .andExpect(jsonPath("$.total_orcado").value(0.0))
                .andExpect(jsonPath("$.total_gasto").value(999.0));

        // Editar = mandar a lista nova inteira. Alimentação saiu: fica sem limite.
        putJson("/api/orcamentos", token, mapa("mes", 3, "ano", 2025, "limites", List.of(
                mapa("categoria_id", moradia, "limite", 1000))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_orcado").value(1000.0))
                .andExpect(jsonPath("$.categorias[?(@.nome == 'Alimentação')].limite").value(contemNull()));

        // Excluir tudo = lista vazia
        putJson("/api/orcamentos", token, mapa("mes", 3, "ano", 2025, "limites", List.of()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_orcado").value(0.0));
    }

    @Test
    void validacoesDevolvem400() throws Exception {
        String token = novoUsuario();
        long moradia = categoria(token, "Moradia");
        long salario = categoria(token, "Salário");

        putJson("/api/orcamentos", token, mapa("mes", 3, "ano", 2025, "limites", List.of(
                mapa("categoria_id", moradia, "limite", -1))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O limite não pode ser negativo."));
        putJson("/api/orcamentos", token, mapa("mes", 3, "ano", 2025, "limites", List.of(
                mapa("categoria_id", salario, "limite", 100))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O orçamento só aceita categorias de despesa (Salário é de receita)."));
        putJson("/api/orcamentos", token, mapa("mes", 3, "ano", 2025, "limites", List.of(
                mapa("categoria_id", moradia, "limite", 1), mapa("categoria_id", moradia, "limite", 2))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A mesma categoria apareceu duas vezes no orçamento."));
        putJson("/api/orcamentos", token, mapa("mes", 13, "ano", 2025, "limites", List.of()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Mês inválido: use um número de 1 a 12."));
        putJson("/api/orcamentos", token, mapa("mes", 3, "ano", 2025))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe os limites."));
        getComToken("/api/orcamentos?mes=0&ano=2025", token)
                .andExpect(status().isBadRequest());
    }

    @Test
    void orcamentoECategoriaDeOutroUsuario() throws Exception {
        String dono = novoUsuario();
        String intruso = novoUsuario();
        long pets = lerId(postJson("/api/categorias", dono, mapa("nome", "Pets", "tipo", "despesa")), "$.id");
        putJson("/api/orcamentos", dono, mapa("mes", 3, "ano", 2025, "limites", List.of(
                mapa("categoria_id", pets, "limite", 300))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_orcado").value(300.0));

        // O intruso não vê o orçamento nem a categoria do dono...
        getComToken("/api/orcamentos?mes=3&ano=2025", intruso)
                .andExpect(jsonPath("$.total_orcado").value(0.0))
                .andExpect(jsonPath("$.categorias", hasSize(8)));
        // ...e não consegue usar a categoria dele
        putJson("/api/orcamentos", intruso, mapa("mes", 3, "ano", 2025, "limites", List.of(
                mapa("categoria_id", pets, "limite", 1))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Categoria não encontrada."));

        // Salvar o orçamento do intruso não mexe no do dono
        putJson("/api/orcamentos", intruso, mapa("mes", 3, "ano", 2025, "limites", List.of()))
                .andExpect(status().isOk());
        getComToken("/api/orcamentos?mes=3&ano=2025", dono)
                .andExpect(jsonPath("$.total_orcado").value(300.0));
    }

    // ------------------------------------------------------------------ utilitários

    private long categoria(String token, String nome) throws Exception {
        List<Number> ids = ler(getComToken("/api/categorias", token), "$[?(@.nome == '" + nome + "')].id");
        return ids.getFirst().longValue();
    }

    private void despesa(String token, Number valor, String data, Long categoriaId) throws Exception {
        postJson("/api/transacoes", token, mapa("tipo", "despesa", "descricao", "x", "valor", valor, "data", data,
                "categoria_id", categoriaId)).andExpect(status().isCreated());
    }

    /** Filtro do JsonPath devolve uma lista; aqui ela deve ser [null]. */
    private static org.hamcrest.Matcher<Object> contemNull() {
        return org.hamcrest.Matchers.equalTo(java.util.Collections.singletonList(null));
    }
}
