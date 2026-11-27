package com.nexum.api.consultor;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import com.nexum.api.IntegracaoTest;
import com.nexum.api.consultor.ClienteIa.MensagemIa;
import com.nexum.api.consultor.ClienteIa.RespostaIa;

/**
 * Consultor IA com o cliente da Anthropic mockado (clienteIa, em IntegracaoTest).
 * Limite diário nos testes: 3 (app.consultor.limite-diario em IntegracaoTest).
 */
class ConsultorControllerTest extends IntegracaoTest {

    private static final String BASE = "/api/consultor";

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void iaNoAr() {
        when(clienteIa.disponivel()).thenReturn(true);
        when(clienteIa.responder(anyString(), anyString(), anyList()))
                .thenReturn(new RespostaIa("Você gastou mais em **Moradia**.", 1200, 85));
    }

    private long novaConversa(String token) throws Exception {
        return lerId(postJson(BASE + "/conversas", token, Map.of()).andExpect(status().isCreated()), "$.id");
    }

    // ------------------------------------------------------------------ fluxo completo

    @Test
    void fluxoCompleto() throws Exception {
        String token = novoUsuario();

        // Conversa nova: vazia e sem título
        long id = lerId(postJson(BASE + "/conversas", token, Map.of())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titulo").value(nullValue()))
                .andExpect(jsonPath("$.atualizado_em").isNotEmpty()), "$.id");
        getComToken(BASE + "/conversas/" + id, token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagens", hasSize(0)));
        getComToken(BASE + "/uso", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usadas_hoje").value(0))
                .andExpect(jsonPath("$.limite").value(3));

        String pergunta = "  Onde estou gastando mais neste mês? Quero cortar gastos para viajar.  ";
        postJson(BASE + "/conversas/" + id + "/mensagens", token, mapa("texto", pergunta))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.pergunta.papel").value("USER"))
                .andExpect(jsonPath("$.pergunta.conteudo").value(pergunta.strip()))
                .andExpect(jsonPath("$.resposta.papel").value("ASSISTANT"))
                .andExpect(jsonPath("$.resposta.conteudo").value("Você gastou mais em **Moradia**."))
                // Título: 40 primeiros caracteres da primeira pergunta
                .andExpect(jsonPath("$.conversa.titulo").value("Onde estou gastando mais neste mês? Quer"))
                .andExpect(jsonPath("$.uso.usadas_hoje").value(1))
                .andExpect(jsonPath("$.uso.limite").value(3));

        // Segunda pergunta não troca o título e envia o histórico em ordem
        postJson(BASE + "/conversas/" + id + "/mensagens", token, mapa("texto", "E no mês passado?"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.conversa.titulo").value("Onde estou gastando mais neste mês? Quer"));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MensagemIa>> captor = ArgumentCaptor.forClass(List.class);
        verify(clienteIa, times(2)).responder(anyString(), anyString(), captor.capture());
        List<MensagemIa> enviadas = captor.getAllValues().get(1);
        assertEquals(3, enviadas.size());
        assertEquals(PapelMensagem.USER, enviadas.get(0).papel());
        assertEquals(PapelMensagem.ASSISTANT, enviadas.get(1).papel());
        assertEquals("E no mês passado?", enviadas.get(2).texto());

        // Mensagens em ordem
        getComToken(BASE + "/conversas/" + id, token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagens", hasSize(4)))
                .andExpect(jsonPath("$.mensagens[0].papel").value("USER"))
                .andExpect(jsonPath("$.mensagens[1].papel").value("ASSISTANT"))
                .andExpect(jsonPath("$.mensagens[2].conteudo").value("E no mês passado?"))
                .andExpect(jsonPath("$.mensagens[3].papel").value("ASSISTANT"));

        // Tokens gravados só nas respostas
        Map<String, Object> resposta = jdbc.queryForMap(
                "select tokens_entrada, tokens_saida from mensagem where conversa_id = ? and papel = 'ASSISTANT' order by id limit 1", id);
        assertEquals(1200, ((Number) resposta.get("tokens_entrada")).intValue());
        assertEquals(85, ((Number) resposta.get("tokens_saida")).intValue());

        // Lista: mais recentes primeiro
        long outra = novaConversa(token);
        getComToken(BASE + "/conversas", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(outra))
                .andExpect(jsonPath("$[1].id").value(id))
                .andExpect(jsonPath("$[1].titulo").value("Onde estou gastando mais neste mês? Quer"));

        // Apagar: some da lista e as mensagens vão junto
        deleteComToken(BASE + "/conversas/" + id, token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagem").value("Conversa apagada."));
        getComToken(BASE + "/conversas/" + id, token).andExpect(status().isNotFound());
        assertEquals(0, jdbc.queryForObject("select count(*) from mensagem where conversa_id = ?", Integer.class, id));
        getComToken(BASE + "/conversas", token).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void historicoLevaNoMaximo10MensagensAnteriores() throws Exception {
        String token = novoUsuario();
        long id = novaConversa(token);
        // 6 pares antigos direto no banco (12 mensagens): não contam no limite de hoje porque são de ontem
        for (int i = 1; i <= 6; i++) {
            jdbc.update("insert into mensagem (conversa_id, papel, conteudo, criado_em) values (?, 'USER', ?, now() - interval '2 days')", id, "p" + i);
            jdbc.update("insert into mensagem (conversa_id, papel, conteudo, criado_em) values (?, 'ASSISTANT', ?, now() - interval '2 days')", id, "r" + i);
        }

        postJson(BASE + "/conversas/" + id + "/mensagens", token, mapa("texto", "nova")).andExpect(status().isCreated());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<MensagemIa>> captor = ArgumentCaptor.forClass(List.class);
        verify(clienteIa).responder(anyString(), anyString(), captor.capture());
        List<MensagemIa> enviadas = captor.getValue();
        assertEquals(11, enviadas.size()); // 10 anteriores + a pergunta nova
        assertEquals("p2", enviadas.get(0).texto());
        assertEquals("r6", enviadas.get(9).texto());
        assertEquals("nova", enviadas.get(10).texto());
    }

    // ------------------------------------------------------------------ validação

    @Test
    void perguntaVaziaOuLongaDemaisDevolve400() throws Exception {
        String token = novoUsuario();
        long id = novaConversa(token);

        postJson(BASE + "/conversas/" + id + "/mensagens", token, mapa("texto", "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Escreva sua pergunta."));
        postJson(BASE + "/conversas/" + id + "/mensagens", token, mapa("texto", "x".repeat(1001)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A pergunta pode ter no máximo 1000 caracteres."));
        postJson(BASE + "/conversas/" + id + "/mensagens", token, mapa("texto", "x".repeat(1000)))
                .andExpect(status().isCreated());
    }

    // ------------------------------------------------------------------ limite diário

    @Test
    void passarDoLimiteDiarioDevolve429() throws Exception {
        String token = novoUsuario();
        long a = novaConversa(token);
        long b = novaConversa(token);

        // O limite é por usuário (soma todas as conversas)
        postJson(BASE + "/conversas/" + a + "/mensagens", token, mapa("texto", "1")).andExpect(status().isCreated());
        postJson(BASE + "/conversas/" + b + "/mensagens", token, mapa("texto", "2")).andExpect(status().isCreated());
        postJson(BASE + "/conversas/" + a + "/mensagens", token, mapa("texto", "3")).andExpect(status().isCreated());

        postJson(BASE + "/conversas/" + b + "/mensagens", token, mapa("texto", "4"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.erro").value("Você usou suas 3 mensagens de hoje. Volte amanhã!"));
        getComToken(BASE + "/uso", token)
                .andExpect(jsonPath("$.usadas_hoje").value(3))
                .andExpect(jsonPath("$.limite").value(3));
        verify(clienteIa, times(3)).responder(anyString(), anyString(), anyList());

        // Outro usuário não é afetado
        String outro = novoUsuario();
        postJson(BASE + "/conversas/" + novaConversa(outro) + "/mensagens", outro, mapa("texto", "oi"))
                .andExpect(status().isCreated());
    }

    @Test
    void perguntasDeOntemNaoContamNoLimite() throws Exception {
        String token = novoUsuario();
        long id = novaConversa(token);
        for (int i = 0; i < 5; i++) {
            jdbc.update("insert into mensagem (conversa_id, papel, conteudo, criado_em) values (?, 'USER', 'antiga', now() - interval '2 days')", id);
        }
        getComToken(BASE + "/uso", token).andExpect(jsonPath("$.usadas_hoje").value(0));
        postJson(BASE + "/conversas/" + id + "/mensagens", token, mapa("texto", "hoje")).andExpect(status().isCreated());
    }

    // ------------------------------------------------------------------ acesso

    @Test
    void conversaDeOutroUsuarioDevolve404() throws Exception {
        String dono = novoUsuario();
        String intruso = novoUsuario();
        long id = novaConversa(dono);
        postJson(BASE + "/conversas/" + id + "/mensagens", dono, mapa("texto", "Segredo")).andExpect(status().isCreated());

        getComToken(BASE + "/conversas/" + id, intruso)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Conversa não encontrada."));
        postJson(BASE + "/conversas/" + id + "/mensagens", intruso, mapa("texto", "oi"))
                .andExpect(status().isNotFound());
        deleteComToken(BASE + "/conversas/" + id, intruso).andExpect(status().isNotFound());
        getComToken(BASE + "/conversas", intruso).andExpect(jsonPath("$", hasSize(0)));

        // Continua inteira para o dono
        getComToken(BASE + "/conversas/" + id, dono)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagens", hasSize(2)));
        getComToken(BASE + "/conversas/999999999", dono).andExpect(status().isNotFound());
    }

    @Test
    void semTokenDevolve401() throws Exception {
        mockMvc.perform(get(BASE + "/conversas")).andExpect(status().isUnauthorized());
        mockMvc.perform(get(BASE + "/uso")).andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ indisponível

    @Test
    void semChaveDaApiTodasAsRotasDevolvem503() throws Exception {
        String token = novoUsuario();
        long id = novaConversa(token);
        when(clienteIa.disponivel()).thenReturn(false);

        getComToken(BASE + "/conversas", token)
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.erro").value("Consultor IA indisponível no momento."));
        postJson(BASE + "/conversas", token, Map.of()).andExpect(status().isServiceUnavailable());
        getComToken(BASE + "/conversas/" + id, token).andExpect(status().isServiceUnavailable());
        deleteComToken(BASE + "/conversas/" + id, token).andExpect(status().isServiceUnavailable());
        postJson(BASE + "/conversas/" + id + "/mensagens", token, mapa("texto", "oi"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.erro").value("Consultor IA indisponível no momento."));
        getComToken(BASE + "/uso", token).andExpect(status().isServiceUnavailable());
        verify(clienteIa, never()).responder(anyString(), anyString(), anyList());

        // O resto da API segue funcionando
        getComToken("/api/categorias", token).andExpect(status().isOk());
        getComToken("/api/auth/me", token).andExpect(status().isOk());
    }

    @Test
    void erroDaAnthropicDevolve503SemSalvarNada() throws Exception {
        String token = novoUsuario();
        long id = novaConversa(token);
        when(clienteIa.responder(anyString(), anyString(), anyList()))
                .thenThrow(new IaIndisponivelException("timeout", null));

        postJson(BASE + "/conversas/" + id + "/mensagens", token, mapa("texto", "Onde gasto mais?"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.erro").value(
                        "O Consultor IA não conseguiu responder agora. Tente de novo em alguns minutos."));

        // A pergunta não foi salva nem contou no limite
        getComToken(BASE + "/conversas/" + id, token)
                .andExpect(jsonPath("$.mensagens", hasSize(0)))
                .andExpect(jsonPath("$.titulo").value(nullValue()));
        getComToken(BASE + "/uso", token).andExpect(jsonPath("$.usadas_hoje").value(0));
    }

    // ------------------------------------------------------------------ dados enviados

    @Test
    void blocoDeDadosTemOsNumerosMasNaoTemNomeNemEmail() throws Exception {
        String email = emailNovo();
        String nome = "Zuleica Pimentel Teste";
        String token = cadastrarELogar(email, nome);
        long usuarioId = ((Number) ler(getComToken("/api/auth/me", token), "$.id_usuario")).longValue();

        long pets = lerId(postJson("/api/categorias", token, mapa("nome", "Pets", "tipo", "despesa")), "$.id");
        String hoje = java.time.LocalDate.now(java.time.ZoneId.of("America/Sao_Paulo")).toString();
        postJson("/api/transacoes", token, mapa("tipo", "despesa", "descricao", "Ração premium", "valor", 189.9,
                "data", hoje, "categoria_id", pets)).andExpect(status().isCreated());
        postJson("/api/transacoes", token, mapa("tipo", "receita", "descricao", "Salário", "valor", 5000,
                "data", hoje)).andExpect(status().isCreated());
        postJson("/api/metas", token, mapa("descricao", "Viagem para Recife", "valor_alvo", 8000, "valor_atual", 2000,
                "data_prazo", "2030-01-01")).andExpect(status().isCreated());

        postJson(BASE + "/conversas/" + novaConversa(token) + "/mensagens", token, mapa("texto", "Como estou?"))
                .andExpect(status().isCreated());

        ArgumentCaptor<String> instrucoes = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> dados = ArgumentCaptor.forClass(String.class);
        verify(clienteIa).responder(instrucoes.capture(), dados.capture(), anyList());
        String bloco = dados.getValue();

        // Tem os dados financeiros
        assertTrue(bloco.contains("Ração premium"), bloco);
        assertTrue(bloco.contains("Pets: R$ 189,90"), bloco);
        assertTrue(bloco.contains("receitas R$ 5.000,00"), bloco);
        assertTrue(bloco.contains("Viagem para Recife: objetivo R$ 8.000,00, guardado R$ 2.000,00 (25%)"), bloco);
        assertTrue(bloco.startsWith("<dados>") && bloco.endsWith("</dados>"), bloco);
        // Não tem nome, e-mail nem id
        for (String proibido : List.of(nome, "Zuleica", email, email.substring(0, email.indexOf('@')))) {
            assertFalse(bloco.contains(proibido), "bloco de dados contém " + proibido);
            assertFalse(instrucoes.getValue().contains(proibido), "instruções contêm " + proibido);
        }
        assertFalse(bloco.contains("id_usuario") || bloco.contains("usuario_id"), bloco);
        assertFalse(bloco.matches("(?s).*\\b" + usuarioId + "\\b.*"), "bloco contém o id do usuário");
        assertTrue(instrucoes.getValue().contains("Consultor Financeiro do Nexum"));
    }

    @Test
    void excluirUsuarioNoPainelApagaAsConversas() throws Exception {
        String admin = tokenAdmin(ADMIN_1);
        String token = novoUsuario();
        long usuarioId = ((Number) ler(getComToken("/api/auth/me", token), "$.id_usuario")).longValue();
        long id = novaConversa(token);
        postJson(BASE + "/conversas/" + id + "/mensagens", token, mapa("texto", "oi")).andExpect(status().isCreated());

        deleteComToken("/api/admin/usuarios/" + usuarioId, admin).andExpect(status().isOk());

        assertEquals(0, jdbc.queryForObject("select count(*) from conversa where usuario_id = ?", Integer.class, usuarioId));
        assertEquals(0, jdbc.queryForObject("select count(*) from mensagem where conversa_id = ?", Integer.class, id));
    }
}
