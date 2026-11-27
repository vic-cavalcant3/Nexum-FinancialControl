package com.nexum.api.categoria;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
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
                        "Essa categoria tem transações. Mova ou apague as transações antes."));
        // Continua lá
        getComToken("/api/categorias", token)
                .andExpect(jsonPath("$[*].nome").value(hasItem("Pets")));
    }

    // ------------------------------------------------------------------ descrição e edição (PUT)

    @Test
    void criarComDescricaoDevolveODescricao() throws Exception {
        String token = novoUsuario();

        postJson("/api/categorias", token,
                mapa("nome", "Academia", "tipo", "despesa", "icone", "dumbbell", "descricao", " Academia e suplementos "))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.descricao").value("Academia e suplementos"))
                .andExpect(jsonPath("$.icone").value("dumbbell"));

        getComToken("/api/categorias", token)
                .andExpect(jsonPath("$[?(@.nome == 'Academia')].descricao").value(hasItem("Academia e suplementos")))
                // As padrão vêm sem descrição
                .andExpect(jsonPath("$[?(@.nome == 'Lazer')].descricao").value(hasItem(nullValue())));
    }

    @Test
    void descricaoMaiorQue60Devolve400() throws Exception {
        String token = novoUsuario();

        postJson("/api/categorias", token, mapa("nome", "Pets", "tipo", "despesa", "descricao", "x".repeat(61)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A descrição pode ter no máximo 60 caracteres."));
    }

    @Test
    void editarCategoriaPropria() throws Exception {
        String token = novoUsuario();
        long id = lerId(postJson("/api/categorias", token,
                mapa("nome", "Pets", "tipo", "despesa", "icone", "paw")), "$.id");

        putJson("/api/categorias/" + id, token, mapa("nome", " Bichos ", "descricao", "Ração e veterinário", "icone", "heart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.nome").value("Bichos"))
                .andExpect(jsonPath("$.descricao").value("Ração e veterinário"))
                .andExpect(jsonPath("$.icone").value("heart"))
                .andExpect(jsonPath("$.tipo").value("despesa"));

        // Descrição vazia apaga
        putJson("/api/categorias/" + id, token, mapa("nome", "Bichos", "descricao", "", "icone", "paw"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.descricao").value(nullValue()));

        getComToken("/api/categorias", token)
                .andExpect(jsonPath("$[*].nome").value(hasItem("Bichos")))
                .andExpect(jsonPath("$[*].nome").value(not(hasItem("Pets"))));
    }

    @Test
    void editarMantendoOMesmoNomeNaoDaConflito() throws Exception {
        String token = novoUsuario();
        long id = lerId(postJson("/api/categorias", token, mapa("nome", "Pets", "tipo", "despesa")), "$.id");

        putJson("/api/categorias/" + id, token, mapa("nome", "PETS", "descricao", "Ração"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("PETS"));
    }

    @Test
    void editarParaNomeRepetidoDevolve409() throws Exception {
        String token = novoUsuario();
        postJson("/api/categorias", token, mapa("nome", "Pets", "tipo", "despesa")).andExpect(status().isCreated());
        long id = lerId(postJson("/api/categorias", token, mapa("nome", "Academia", "tipo", "despesa")), "$.id");

        putJson("/api/categorias/" + id, token, mapa("nome", "pets"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Você já tem uma categoria com esse nome e tipo."));
        // Nome de categoria padrão do mesmo tipo
        putJson("/api/categorias/" + id, token, mapa("nome", "Lazer"))
                .andExpect(status().isConflict());
    }

    @Test
    void editarComDadosInvalidosDevolve400() throws Exception {
        String token = novoUsuario();
        long id = lerId(postJson("/api/categorias", token, mapa("nome", "Pets", "tipo", "despesa")), "$.id");

        putJson("/api/categorias/" + id, token, mapa("nome", "  "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o nome da categoria."));
        putJson("/api/categorias/" + id, token, mapa("nome", "Pets", "descricao", "x".repeat(61)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A descrição pode ter no máximo 60 caracteres."));
    }

    @Test
    void categoriaPadraoNaoPodeSerEditada() throws Exception {
        String token = novoUsuario();
        Long idPadrao = jdbc.queryForObject(
                "select id from categoria where usuario_id is null and nome = 'Lazer'", Long.class);

        putJson("/api/categorias/" + idPadrao, token, mapa("nome", "Diversão"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("Categorias padrão não podem ser editadas."));
        getComToken("/api/categorias", token)
                .andExpect(jsonPath("$[*].nome").value(hasItem("Lazer")));
    }

    @Test
    void editarCategoriaDeOutroUsuarioDevolve404() throws Exception {
        String dono = novoUsuario();
        String intruso = novoUsuario();
        long id = lerId(postJson("/api/categorias", dono, mapa("nome", "Secreta", "tipo", "despesa")), "$.id");

        putJson("/api/categorias/" + id, intruso, mapa("nome", "Invadida"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Categoria não encontrada."));
        getComToken("/api/categorias", dono)
                .andExpect(jsonPath("$[*].nome").value(hasItem("Secreta")));
    }

    @Test
    void editarCategoriaInexistenteDevolve404() throws Exception {
        String token = novoUsuario();

        putJson("/api/categorias/999999999", token, mapa("nome", "Nada"))
                .andExpect(status().isNotFound());
    }

    @Test
    void semTokenDevolve401() throws Exception {
        mockMvc.perform(get("/api/categorias")).andExpect(status().isUnauthorized());
    }
}
