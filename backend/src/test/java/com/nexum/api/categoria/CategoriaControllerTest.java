package com.nexum.api.categoria;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import com.jayway.jsonpath.JsonPath;
import com.nexum.api.IntegracaoTest;

class CategoriaControllerTest extends IntegracaoTest {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void listarTrazAsPadraoComTipoEIcone() throws Exception {
        String token = novoUsuario();

        getComToken("/api/categorias", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.nome == 'Alimentação')].tipo").value(hasItem("despesa")))
                .andExpect(jsonPath("$[?(@.nome == 'Alimentação')].icone").value(hasItem("utensils")))
                .andExpect(jsonPath("$[?(@.nome == 'Alimentação')].padrao").value(hasItem(true)))
                .andExpect(jsonPath("$[?(@.nome == 'Salário')].tipo").value(hasItem("receita")));
    }

    @Test
    void criarListarEExcluirCategoriaPropria() throws Exception {
        String token = novoUsuario();

        var criada = postJson("/api/categorias", token, mapa("nome", "Pets", "tipo", "DESPESA", "icone", "paw"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("Pets"))
                .andExpect(jsonPath("$.tipo").value("despesa")) // aceita maiúsculo, devolve minúsculo
                .andExpect(jsonPath("$.icone").value("paw"))
                .andExpect(jsonPath("$.padrao").value(false))
                .andExpect(jsonPath("$.usuario_id").isNumber());
        long id = lerId(criada, "$.id");

        getComToken("/api/categorias", token)
                .andExpect(jsonPath("$[*].nome").value(hasItem("Pets")));

        deleteComToken("/api/categorias/" + id, token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagem").value("Categoria removida."));

        getComToken("/api/categorias", token)
                .andExpect(jsonPath("$[*].nome").value(not(hasItem("Pets"))));
    }

    @Test
    void nomeRepetidoNoMesmoTipoDevolve409() throws Exception {
        String token = novoUsuario();
        postJson("/api/categorias", token, mapa("nome", "Pets", "tipo", "despesa")).andExpect(status().isCreated());

        postJson("/api/categorias", token, mapa("nome", "pets", "tipo", "despesa"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Você já tem uma categoria com esse nome e tipo."));
        // Mesmo nome de uma categoria padrão
        postJson("/api/categorias", token, mapa("nome", "Lazer", "tipo", "despesa"))
                .andExpect(status().isConflict());
        // Mesmo nome em outro tipo pode
        postJson("/api/categorias", token, mapa("nome", "Pets", "tipo", "receita"))
                .andExpect(status().isCreated());
    }

    @Test
    void dadosInvalidosDevolvem400() throws Exception {
        String token = novoUsuario();

        postJson("/api/categorias", token, mapa("nome", "Pets", "tipo", "investimento"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Tipo inválido: use receita ou despesa."));
        postJson("/api/categorias", token, mapa("nome", " ", "tipo", "despesa"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o nome da categoria."));
        deleteComToken("/api/categorias/abc", token)
                .andExpect(status().isBadRequest());
    }

    @Test
    void categoriaPadraoNaoPodeSerExcluida() throws Exception {
        String token = novoUsuario();
        Long idPadrao = jdbc.queryForObject(
                "select id from categoria where usuario_id is null and nome = 'Lazer'", Long.class);

        deleteComToken("/api/categorias/" + idPadrao, token)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("Categorias padrão não podem ser excluídas."));
    }

    @Test
    void categoriaDeOutroUsuarioDevolve404EFicaInvisivel() throws Exception {
        String dono = novoUsuario();
        String intruso = novoUsuario();
        long id = lerId(postJson("/api/categorias", dono, mapa("nome", "Secreta", "tipo", "despesa")), "$.id");

        deleteComToken("/api/categorias/" + id, intruso)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Categoria não encontrada."));
        getComToken("/api/categorias", intruso)
                .andExpect(jsonPath("$[*].nome").value(not(hasItem("Secreta"))));
        // Continua existindo para o dono
        getComToken("/api/categorias", dono)
                .andExpect(jsonPath("$[*].nome").value(hasItem("Secreta")));
    }

    @Test
    void categoriaComTransacoesDevolve409() throws Exception {
        String token = novoUsuario();
        long id = lerId(postJson("/api/categorias", token, mapa("nome", "Pets", "tipo", "despesa")), "$.id");
        Number usuarioId = JsonPath.read(getComToken("/api/auth/me", token).andReturn()
                .getResponse().getContentAsString(), "$.id_usuario");
        jdbc.update("insert into transacao (usuario_id, categoria_id, tipo, valor, data) values (?, ?, 'despesa', 10, now())",
                usuarioId.longValue(), id);

        deleteComToken("/api/categorias/" + id, token)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value(
                        "Não dá para excluir a categoria \"Pets\": 1 transação usa ela. "
                                + "Troque a categoria dessas transações ou exclua-as antes."));
    }

    @Test
    void semTokenDevolve401() throws Exception {
        mockMvc.perform(get("/api/categorias")).andExpect(status().isUnauthorized());
    }
}
