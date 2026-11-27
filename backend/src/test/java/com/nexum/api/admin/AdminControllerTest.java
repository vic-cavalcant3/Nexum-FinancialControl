package com.nexum.api.admin;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import com.nexum.api.IntegracaoTest;

/**
 * Painel de admin. ADMIN_1 e ADMIN_2 estão em app.admin-emails (IntegracaoTest);
 * qualquer outro e-mail vira USER.
 */
class AdminControllerTest extends IntegracaoTest {

    private static final String ACESSO_RESTRITO = "Acesso restrito a administradores.";

    @Autowired
    private JdbcTemplate jdbc;

    // ------------------------------------------------------------------ permissão

    @Test
    void userRecebe403EmTodasAsRotasDeAdmin() throws Exception {
        String token = novoUsuario();

        getComToken("/api/admin/estatisticas", token)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value(ACESSO_RESTRITO));
        getComToken("/api/admin/usuarios", token)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value(ACESSO_RESTRITO));
        deleteComToken("/api/admin/usuarios/1", token)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value(ACESSO_RESTRITO));
    }

    @Test
    void semTokenRecebe401() throws Exception {
        mockMvc.perform(get("/api/admin/estatisticas"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").value("Autenticação necessária."));
    }

    @Test
    void loginEMeDevolvemOPapel() throws Exception {
        String admin = tokenAdmin(ADMIN_1);
        getComToken("/api/auth/me", admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(ADMIN_1))
                .andExpect(jsonPath("$.papel").value("ADMIN"));

        String user = novoUsuario();
        getComToken("/api/auth/me", user).andExpect(jsonPath("$.papel").value("USER"));

        // Login também devolve o papel e grava o último acesso
        postJson("/api/auth/login", null, mapa("email", ADMIN_1, "senha", SENHA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario.papel").value("ADMIN"));
        Integer comAcesso = jdbc.queryForObject(
                "select count(*) from usuario where email = ? and ultimo_acesso is not null", Integer.class, ADMIN_1);
        assertEquals(1, comAcesso);
    }

    // ------------------------------------------------------------------ estatísticas

    @Test
    void estatisticas() throws Exception {
        String admin = tokenAdmin(ADMIN_1);
        String user = novoUsuario();
        postJson("/api/metas", user, mapa("descricao", "Reserva", "valor_alvo", 1000, "data_prazo", "2030-01-01"))
                .andExpect(status().isCreated());

        String mesAtual = YearMonth.now(ZoneId.of("America/Sao_Paulo")).toString(); // "2026-11"
        int ano = Integer.parseInt(mesAtual.substring(0, 4));
        int mes = Integer.parseInt(mesAtual.substring(5));

        getComToken("/api/admin/estatisticas", admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_usuarios").value(greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.novos_ultimos_30_dias").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.ativos_ultimos_7_dias").value(greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.total_transacoes").isNumber())
                .andExpect(jsonPath("$.total_metas").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.cadastros_por_mes", hasSize(12)))
                .andExpect(jsonPath("$.cadastros_por_mes[11].ano").value(ano))
                .andExpect(jsonPath("$.cadastros_por_mes[11].mes").value(mes))
                .andExpect(jsonPath("$.cadastros_por_mes[11].total").value(greaterThanOrEqualTo(1)));
    }

    // ------------------------------------------------------------------ listagem

    @Test
    void listagemComBuscaEPaginacao() throws Exception {
        String admin = tokenAdmin(ADMIN_1);
        String marca = "Zebra" + UUID.randomUUID().toString().substring(0, 8);
        String email = "lista-" + UUID.randomUUID() + "@nexum.app";
        String user = cadastrarELogar(email, "Ana " + marca);

        postJson("/api/transacoes", user, mapa("tipo", "despesa", "descricao", "Mercado", "valor", 50, "data", "2026-03-10"))
                .andExpect(status().isCreated());
        postJson("/api/transacoes", user, mapa("tipo", "receita", "descricao", "Salário", "valor", 3000, "data", "2026-03-05"))
                .andExpect(status().isCreated());
        postJson("/api/metas", user, mapa("descricao", "Viagem", "valor_alvo", 5000, "data_prazo", "2030-01-01"))
                .andExpect(status().isCreated());

        // Busca pelo nome, sem diferenciar maiúsculas
        getComToken("/api/admin/usuarios?busca=" + marca.toUpperCase(), admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.pagina").value(0))
                .andExpect(jsonPath("$.tamanho").value(20))
                .andExpect(jsonPath("$.total_paginas").value(1))
                .andExpect(jsonPath("$.usuarios", hasSize(1)))
                .andExpect(jsonPath("$.usuarios[0].id_usuario").isNumber())
                .andExpect(jsonPath("$.usuarios[0].nome").value("Ana " + marca))
                .andExpect(jsonPath("$.usuarios[0].email").value(email))
                .andExpect(jsonPath("$.usuarios[0].papel").value("USER"))
                .andExpect(jsonPath("$.usuarios[0].criado_em").isString())
                .andExpect(jsonPath("$.usuarios[0].ultimo_acesso").isString())
                .andExpect(jsonPath("$.usuarios[0].qtd_transacoes").value(2))
                .andExpect(jsonPath("$.usuarios[0].qtd_metas").value(1))
                .andExpect(jsonPath("$.usuarios[0].senha_hash").doesNotExist());

        // Busca por trecho do e-mail
        getComToken("/api/admin/usuarios?busca=" + email.substring(0, 20), admin)
                .andExpect(jsonPath("$.total").value(1));

        // % e _ digitados não são curinga
        mockMvc.perform(get("/api/admin/usuarios?busca={b}", "%_" + marca).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));

        // Paginação: 1 por página
        long total = ((Number) ler(getComToken("/api/admin/usuarios", admin), "$.total")).longValue();
        getComToken("/api/admin/usuarios?pagina=1&tamanho=1", admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagina").value(1))
                .andExpect(jsonPath("$.usuarios", hasSize(1)))
                .andExpect(jsonPath("$.total_paginas").value((int) total));

        getComToken("/api/admin/usuarios?pagina=-1", admin)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A página começa em 0."));
        getComToken("/api/admin/usuarios?tamanho=500", admin)
                .andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------------ exclusão

    @Test
    void excluirApagaUsuarioETodosOsDadosDele() throws Exception {
        String admin = tokenAdmin(ADMIN_1);
        String email = emailNovo();
        String user = cadastrarELogar(email, "Para Excluir");
        long id = idDoUsuario(user);

        long categoria = lerId(postJson("/api/categorias", user, mapa("nome", "Pets", "tipo", "despesa", "icone", "dots"))
                .andExpect(status().isCreated()), "$.id");
        postJson("/api/transacoes", user, mapa("tipo", "despesa", "descricao", "Ração", "valor", 80,
                "data", "2026-03-10", "categoria_id", categoria)).andExpect(status().isCreated());
        postJson("/api/metas", user, mapa("descricao", "Carro", "valor_alvo", 20000, "data_prazo", "2030-01-01"))
                .andExpect(status().isCreated());
        putJson("/api/orcamentos", user, mapa("mes", 3, "ano", 2026, "limites", List.of(mapa("categoria_id", categoria, "limite", 300))))
                .andExpect(status().isOk());
        // Conversa do Consultor IA com uma mensagem
        Long conversa = jdbc.queryForObject("insert into conversa (usuario_id, titulo) values (?, 'Teste') returning id",
                Long.class, id);
        jdbc.update("insert into mensagem (conversa_id, papel, conteudo) values (?, 'USER', 'Oi')", conversa);

        deleteComToken("/api/admin/usuarios/" + id, admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagem").value("Usuário excluído."));

        for (String tabela : List.of("transacao", "meta", "categoria", "orcamento", "conversa")) {
            Integer restantes = jdbc.queryForObject("select count(*) from " + tabela + " where usuario_id = ?", Integer.class, id);
            assertEquals(0, restantes, "sobrou linha em " + tabela);
        }
        assertEquals(0, jdbc.queryForObject("select count(*) from mensagem where conversa_id = ?", Integer.class, conversa));
        Integer usuarios = jdbc.queryForObject("select count(*) from usuario where id_usuario = ?", Integer.class, id);
        assertEquals(0, usuarios);

        // O token do usuário apagado deixa de valer
        getComToken("/api/auth/me", user).andExpect(status().isUnauthorized());
        // Apagar de novo: 404
        deleteComToken("/api/admin/usuarios/" + id, admin).andExpect(status().isNotFound());
    }

    @Test
    void naoApagaASiMesmoNemOutroAdmin() throws Exception {
        String admin1 = tokenAdmin(ADMIN_1);
        String admin2 = tokenAdmin(ADMIN_2);

        deleteComToken("/api/admin/usuarios/" + idDoUsuario(admin1), admin1)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("Você não pode excluir a sua própria conta."));

        deleteComToken("/api/admin/usuarios/" + idDoUsuario(admin2), admin1)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("Não é possível excluir outro administrador."));

        // Os dois continuam lá
        getComToken("/api/auth/me", admin1).andExpect(status().isOk());
        getComToken("/api/auth/me", admin2).andExpect(status().isOk());
    }

    @Test
    void padraoDeBuscaEscapaCuringas() {
        assertEquals("%", AdminService.padraoBusca(null));
        assertEquals("%", AdminService.padraoBusca("   "));
        assertEquals("%ma!_ria!%%", AdminService.padraoBusca(" Ma_ria% "));
    }

    private long idDoUsuario(String token) throws Exception {
        return lerId(getComToken("/api/auth/me", token), "$.id_usuario");
    }
}
