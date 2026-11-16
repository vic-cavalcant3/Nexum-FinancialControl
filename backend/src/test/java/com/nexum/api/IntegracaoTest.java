package com.nexum.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import tools.jackson.databind.ObjectMapper;

/**
 * Base dos testes de integração: sobe a aplicação inteira + Postgres (Testcontainers).
 * Todas as classes que estendem esta usam a MESMA configuração, então o Spring reaproveita
 * um único contexto e um único container (muito mais rápido).
 * <p>
 * Cada teste cria usuários novos (e-mail aleatório), então um teste não enxerga os dados do outro.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
public abstract class IntegracaoTest {

    protected static final String SENHA = "segredo123";

    @DynamicPropertySource
    static void propriedades(DynamicPropertyRegistry registry) {
        // Segredo aleatório a cada execução: nenhuma chave fica salva no código.
        registry.add("app.jwt.secret", () -> UUID.randomUUID() + "-" + UUID.randomUUID());
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    // ------------------------------------------------------------------ usuários

    protected static String emailNovo() {
        return "teste-" + UUID.randomUUID() + "@nexum.app";
    }

    /** Cadastra um usuário novo e devolve o token dele. */
    protected String novoUsuario() throws Exception {
        String email = emailNovo();
        enviar(post("/api/auth/registrar"), null, mapa("nome", "Usuário Teste", "email", email, "senha", SENHA))
                .andExpect(status().isCreated());
        String corpo = enviar(post("/api/auth/login"), null, mapa("email", email, "senha", SENHA))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(corpo, "$.token");
    }

    // ------------------------------------------------------------------ requisições

    protected ResultActions getComToken(String url, String token) throws Exception {
        return mockMvc.perform(comToken(get(url), token));
    }

    protected ResultActions postJson(String url, String token, Object corpo) throws Exception {
        return enviar(post(url), token, corpo);
    }

    protected ResultActions putJson(String url, String token, Object corpo) throws Exception {
        return enviar(put(url), token, corpo);
    }

    protected ResultActions deleteComToken(String url, String token) throws Exception {
        return mockMvc.perform(comToken(delete(url), token));
    }

    protected ResultActions enviar(MockHttpServletRequestBuilder requisicao, String token, Object corpo) throws Exception {
        return mockMvc.perform(comToken(requisicao, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(corpo)));
    }

    private static MockHttpServletRequestBuilder comToken(MockHttpServletRequestBuilder requisicao, String token) {
        return token == null ? requisicao : requisicao.header("Authorization", "Bearer " + token);
    }

    /** Lê um campo da resposta JSON. Ex.: {@code ler(resultado, "$.id")}. */
    protected static <T> T ler(ResultActions resultado, String caminho) throws Exception {
        return JsonPath.read(resultado.andReturn().getResponse().getContentAsString(), caminho);
    }

    /** Lê um id numérico da resposta (JsonPath devolve Integer para números pequenos). */
    protected static long lerId(ResultActions resultado, String caminho) throws Exception {
        Number n = ler(resultado, caminho);
        return n.longValue();
    }

    /** Map em ordem, aceitando null: mapa("nome", "X", "icone", null). */
    protected static Map<String, Object> mapa(Object... chavesEValores) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < chavesEValores.length; i += 2) {
            m.put((String) chavesEValores[i], chavesEValores[i + 1]);
        }
        return m;
    }
}
