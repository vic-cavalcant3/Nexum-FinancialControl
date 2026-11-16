package com.nexum.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** Sobe a aplicação inteira e confere o básico: contexto, health e rotas inexistentes. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class NexumApiApplicationTests {

    @DynamicPropertySource
    static void propriedades(DynamicPropertyRegistry registry) {
        // Segredo aleatório a cada execução: nenhuma chave fica salva no código.
        registry.add("app.jwt.secret", () -> UUID.randomUUID() + "-" + UUID.randomUUID());
    }

    @Autowired
    MockMvc mockMvc;

    @Test
    void healthEhPublicoERespondeOk() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void rotaProtegidaSemTokenDevolve401NoFormatoPadrao() throws Exception {
        mockMvc.perform(get("/api/qualquer-coisa"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").isString());
    }
}
