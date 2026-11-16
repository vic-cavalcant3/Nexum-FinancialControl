package com.nexum.api.meta;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import com.nexum.api.IntegracaoTest;

class MetaControllerTest extends IntegracaoTest {

    @Test
    void criarListarEditarEExcluir() throws Exception {
        String token = novoUsuario();

        // Igual ao que o modal "Nova meta" manda
        ResultActions criada = postJson("/api/metas", token, mapa(
                "descricao", "Viagem para Bali", "valor_alvo", 5000, "valor_atual", 3450,
                "aporte_mensal", 600, "data_prazo", "2026-12-01", "data_inicio", "2026-06-01", "icone", "viagem"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id_meta").isNumber())
                .andExpect(jsonPath("$.id_usuario").isNumber())
                .andExpect(jsonPath("$.descricao").value("Viagem para Bali"))
                .andExpect(jsonPath("$.valor_alvo").value(5000.0))
                .andExpect(jsonPath("$.valor_atual").value(3450.0))
                .andExpect(jsonPath("$.aporte_mensal").value(600.0))
                .andExpect(jsonPath("$.data_prazo").value("2026-12-01"))
                .andExpect(jsonPath("$.data_inicio").value("2026-06-01"))
                .andExpect(jsonPath("$.status_meta").value("em_andamento"))
                .andExpect(jsonPath("$.icone").value("viagem"))
                .andExpect(jsonPath("$.percentual").value(69)); // 3450/5000 = 69%
        long id = lerId(criada, "$.id_meta");

        getComToken("/api/metas", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].descricao").value("Viagem para Bali"));

        // PUT sem ícone e sem aporte: mantém os atuais. Passou do objetivo: percentual para em 100.
        putJson("/api/metas/" + id, token, mapa(
                "descricao", "Viagem para Bali e Lombok", "valor_alvo", 5000, "valor_atual", 6000, "data_prazo", "2027-01-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.descricao").value("Viagem para Bali e Lombok"))
                .andExpect(jsonPath("$.valor_atual").value(6000.0))
                .andExpect(jsonPath("$.aporte_mensal").value(600.0))
                .andExpect(jsonPath("$.data_prazo").value("2027-01-15"))
                .andExpect(jsonPath("$.icone").value("viagem"))
                .andExpect(jsonPath("$.percentual").value(100));

        // icone "" remove o ícone
        putJson("/api/metas/" + id, token, mapa(
                "descricao", "Viagem", "valor_alvo", 5000, "data_prazo", "2027-01-15", "icone", ""))
                .andExpect(jsonPath("$.icone").doesNotExist());

        deleteComToken("/api/metas/" + id, token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagem").value("Meta removida."));
        getComToken("/api/metas", token).andExpect(jsonPath("$", hasSize(0)));
        getComToken("/api/metas/" + id, token).andExpect(status().isNotFound());
    }

    @Test
    void padroesDaCriacaoEOrdemPorPrazo() throws Exception {
        String token = novoUsuario();
        postJson("/api/metas", token, mapa("descricao", "Carro", "valor_alvo", 25000, "data_prazo", "2028-01-01"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.valor_atual").value(0.0))
                .andExpect(jsonPath("$.aporte_mensal").value(0.0))
                .andExpect(jsonPath("$.data_inicio").value(LocalDate.now(ZoneId.of("America/Sao_Paulo")).toString()))
                .andExpect(jsonPath("$.percentual").value(0));
        postJson("/api/metas", token, mapa("descricao", "Reserva", "valor_alvo", 3000, "valor_atual", 2999.99,
                "data_prazo", "2027-01-01"))
                .andExpect(jsonPath("$.percentual").value(99)); // arredonda para baixo

        getComToken("/api/metas", token)
                .andExpect(jsonPath("$[*].descricao", contains("Reserva", "Carro")));
    }

    @Test
    void validacoesDevolvem400() throws Exception {
        String token = novoUsuario();

        postJson("/api/metas", token, mapa("descricao", "", "valor_alvo", 100, "data_prazo", "2027-01-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o nome da meta."));
        postJson("/api/metas", token, mapa("descricao", "X", "valor_alvo", 0, "data_prazo", "2027-01-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O valor objetivo deve ser maior que zero."));
        postJson("/api/metas", token, mapa("descricao", "X", "valor_alvo", 100, "valor_atual", -1, "data_prazo", "2027-01-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O valor guardado não pode ser negativo."));
        postJson("/api/metas", token, mapa("descricao", "X", "valor_alvo", 100))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe a data prevista."));
        postJson("/api/metas", token, mapa("descricao", "X", "valor_alvo", 100, "data_prazo", "01/01/2027"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Valor inválido no campo data_prazo."));
        postJson("/api/metas", token, mapa("descricao", "X", "valor_alvo", 100, "data_prazo", "2026-01-01",
                "data_inicio", "2026-06-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A data prevista não pode ser antes da data de início."));
        postJson("/api/metas", token, mapa("descricao", "X", "valor_alvo", 100, "data_prazo", "2027-01-01",
                "status_meta", "pausada"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void metaDeOutroUsuarioDevolve404() throws Exception {
        String dono = novoUsuario();
        String intruso = novoUsuario();
        long id = lerId(postJson("/api/metas", dono,
                mapa("descricao", "Notebook", "valor_alvo", 1800, "data_prazo", "2027-01-01")), "$.id_meta");

        getComToken("/api/metas/" + id, intruso)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Meta não encontrada."));
        putJson("/api/metas/" + id, intruso, mapa("descricao", "Hack", "valor_alvo", 1, "data_prazo", "2027-01-01"))
                .andExpect(status().isNotFound());
        deleteComToken("/api/metas/" + id, intruso).andExpect(status().isNotFound());
        getComToken("/api/metas", intruso).andExpect(jsonPath("$", hasSize(0)));

        getComToken("/api/metas/" + id, dono).andExpect(jsonPath("$.descricao").value("Notebook"));
    }
}
