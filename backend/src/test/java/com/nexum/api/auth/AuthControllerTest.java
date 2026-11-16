package com.nexum.api.auth;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;
import com.nexum.api.IntegracaoTest;

/**
 * Testes de ponta a ponta da autenticação, com banco Postgres de verdade (Testcontainers).
 * Cada teste usa um e-mail novo, então a ordem de execução não importa.
 */
class AuthControllerTest extends IntegracaoTest {

    // ------------------------------------------------------------------ registrar

    @Test
    void registrarDevolve201ComUsuarioSemSenha() throws Exception {
        String email = emailNovo();

        registrar("Maria Teste", email.toUpperCase(), SENHA)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.id_usuario").isNumber())
                .andExpect(jsonPath("$.usuario.nome").value("Maria Teste"))
                .andExpect(jsonPath("$.usuario.email").value(email)) // salvo em minúsculas
                .andExpect(jsonPath("$.usuario.senha_hash").doesNotExist())
                .andExpect(jsonPath("$.usuario.senha").doesNotExist());
    }

    @Test
    void registrarComEmailRepetidoDevolve409() throws Exception {
        String email = emailNovo();
        registrar("Primeiro", email, SENHA).andExpect(status().isCreated());

        registrar("Segundo", email, SENHA)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("E-mail já cadastrado"));
    }

    @Test
    void registrarComDadosInvalidosDevolve400() throws Exception {
        registrar("Sem Senha Boa", emailNovo(), "123")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A senha deve ter entre 6 e 72 caracteres."));
    }

    // ------------------------------------------------------------------ login

    @Test
    void loginCertoDevolveTokenEUsuario() throws Exception {
        String email = emailNovo();
        registrar("João Teste", email, SENHA).andExpect(status().isCreated());

        login(email, SENHA)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value(not(emptyOrNullString())))
                .andExpect(jsonPath("$.usuario.id_usuario").isNumber())
                .andExpect(jsonPath("$.usuario.nome").value("João Teste"))
                .andExpect(jsonPath("$.usuario.email").value(email));
    }

    @Test
    void loginComSenhaErradaDevolve401() throws Exception {
        String email = emailNovo();
        registrar("Ana Teste", email, SENHA).andExpect(status().isCreated());

        login(email, "senha-errada")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("E-mail ou senha inválidos"));
    }

    @Test
    void loginComEmailInexistenteDevolveMesmo401() throws Exception {
        login(emailNovo(), SENHA)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("E-mail ou senha inválidos"));
    }

    // ------------------------------------------------------------------ rotas protegidas

    @Test
    void meSemTokenDevolve401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Autenticação necessária."));
    }

    @Test
    void meComTokenInvalidoDevolve401() throws Exception {
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer isso.nao.eh-um-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Token inválido."));
    }

    @Test
    void meComTokenDevolve200ComODonoDoToken() throws Exception {
        String email = emailNovo();
        registrar("Pedro Teste", email, SENHA).andExpect(status().isCreated());
        String token = tokenDe(email, SENHA);

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.nome").value("Pedro Teste"));
    }

    @Test
    void perfilAtualizaNomeEEmail() throws Exception {
        String email = emailNovo();
        registrar("Nome Antigo", email, SENHA).andExpect(status().isCreated());
        String token = tokenDe(email, SENHA);
        String novoEmail = emailNovo();

        mockMvc.perform(put("/api/auth/perfil")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("nome", "Nome Novo", "email", novoEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Nome Novo"))
                .andExpect(jsonPath("$.email").value(novoEmail));

        // O token continua valendo (ele guarda o id, não o e-mail).
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(novoEmail));
    }

    @Test
    void trocarSenhaComSenhaAtualErradaDevolve400EComCertaFunciona() throws Exception {
        String email = emailNovo();
        registrar("Troca Senha", email, SENHA).andExpect(status().isCreated());
        String token = tokenDe(email, SENHA);

        mockMvc.perform(put("/api/auth/trocar-senha")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("senha_atual", "errada", "nova_senha", "novaSenha456")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Senha atual incorreta."));

        mockMvc.perform(put("/api/auth/trocar-senha")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("senha_atual", SENHA, "nova_senha", "novaSenha456")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagem").value("Senha alterada com sucesso."));

        login(email, SENHA).andExpect(status().isUnauthorized());
        login(email, "novaSenha456").andExpect(status().isOk());
    }

    // ------------------------------------------------------------------ utilitários

    private ResultActions registrar(String nome, String email, String senha) throws Exception {
        return mockMvc.perform(post("/api/auth/registrar")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("nome", nome, "email", email, "senha", senha)));
    }

    private ResultActions login(String email, String senha) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json("email", email, "senha", senha)));
    }

    private String tokenDe(String email, String senha) throws Exception {
        String corpo = login(email, senha).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(corpo, "$.token");
    }

    /** Monta um JSON simples a partir de pares chave/valor (todos texto). */
    private static String json(String... chavesEValores) {
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < chavesEValores.length; i += 2) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append('"').append(chavesEValores[i]).append("\":\"").append(chavesEValores[i + 1]).append('"');
        }
        return sb.append('}').toString();
    }
}
