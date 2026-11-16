package com.nexum.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

/** Confere o básico: contexto sobe, health público e 401 no formato padrão. */
class NexumApiApplicationTests extends IntegracaoTest {

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
