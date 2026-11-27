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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;
import com.nexum.api.consultor.ClienteIa;

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
        // Dois admins fixos para os testes do painel (AdminControllerTest).
        registry.add("app.admin-emails", () -> ADMIN_1 + "," + ADMIN_2);
        // Consultor IA: limite baixo para o teste do 429 (ConsultorControllerTest).
        registry.add("app.consultor.limite-diario", () -> "3");

        // Sem Docker: usa o Postgres de TEST_DB_URL (ver TestcontainersConfig).
        String urlTeste = System.getenv("TEST_DB_URL");
        if (urlTeste != null && !urlTeste.isBlank()) {
            registry.add("spring.datasource.url", () -> urlTeste);
            registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("TEST_DB_USER", "postgres"));
            registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("TEST_DB_PASSWORD", ""));
        }
    }

    protected static final String ADMIN_1 = "admin1-teste@nexum.app";
    protected static final String ADMIN_2 = "admin2-teste@nexum.app";

    @Autowired
    protected MockMvc mockMvc;

    /**
     * Cliente do Claude mockado em TODOS os testes (fica na base para todas as classes
     * dividirem o mesmo contexto do Spring). Nenhum teste chama a API da Anthropic.
     * Padrão do mock: disponivel() = false (como se não houvesse ANTHROPIC_API_KEY).
     */
    @MockitoBean
    protected ClienteIa clienteIa;

    @Autowired
    protected ObjectMapper objectMapper;

    // ------------------------------------------------------------------ usuários

    protected static String emailNovo() {
        return "teste-" + UUID.randomUUID() + "@nexum.app";
    }

    /** Cadastra um usuário novo e devolve o token dele. */
    protected String novoUsuario() throws Exception {
        return cadastrarELogar(emailNovo(), "Usuário Teste");
    }

    /**
     * Token de um admin fixo (ADMIN_1 / ADMIN_2). O e-mail é sempre o mesmo, então o cadastro
     * só acontece na primeira vez (409 nas seguintes é esperado).
     */
    protected String tokenAdmin(String email) throws Exception {
        int status = enviar(post("/api/auth/registrar"), null, mapa("nome", "Admin Teste", "email", email, "senha", SENHA))
                .andReturn().getResponse().getStatus();
        if (status != 201 && status != 409) {
            throw new IllegalStateException("Cadastro do admin de teste falhou: HTTP " + status);
        }
        return login(email);
    }

    protected String cadastrarELogar(String email, String nome) throws Exception {
        enviar(post("/api/auth/registrar"), null, mapa("nome", nome, "email", email, "senha", SENHA))
                .andExpect(status().isCreated());
        return login(email);
    }

    protected String login(String email) throws Exception {
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
