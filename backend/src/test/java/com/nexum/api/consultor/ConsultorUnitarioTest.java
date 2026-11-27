package com.nexum.api.consultor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

/** Testes sem Spring e sem banco (rodam em qualquer máquina). Nenhum chama a Anthropic. */
class ConsultorUnitarioTest {

    @Test
    void semChaveOClienteFicaIndisponivelENaoChamaNada() {
        AnthropicClienteIa cliente = new AnthropicClienteIa(new ConsultorProperties("  ", null, 0, 0, 0));
        assertFalse(cliente.disponivel());
        assertThrows(IaIndisponivelException.class,
                () -> cliente.responder("x", "y", List.of(new ClienteIa.MensagemIa(PapelMensagem.USER, "oi"))));
        cliente.destroy();
    }

    @Test
    void comChaveOClienteFicaDisponivel() {
        // Só monta o cliente do SDK (nenhuma requisição é feita).
        AnthropicClienteIa cliente = new AnthropicClienteIa(new ConsultorProperties("sk-ant-teste", "claude-haiku-5-5", 20, 800, 60));
        assertTrue(cliente.disponivel());
        cliente.destroy();
    }

    @Test
    void propriedadesTemPadroesENaoMostramAChave() {
        ConsultorProperties p = new ConsultorProperties("sk-ant-segredo-123", "", 0, 0, 0);
        assertEquals("claude-haiku-5-5", p.modelo());
        assertEquals(20, p.limiteDiario());
        assertEquals(800, p.maxTokens());
        assertEquals(60, p.timeoutSegundos());
        assertFalse(p.toString().contains("segredo"), p.toString());
    }

    @Test
    void tituloSaoOs40PrimeirosCaracteresNumaLinha() {
        assertEquals("Oi", Conversa.tituloDe("  Oi  "));
        assertEquals("Como economizar R$ 200 este mês?", Conversa.tituloDe("Como economizar\nR$ 200   este mês?"));
        String longa = "Estou no caminho das minhas metas de viagem e de reserva de emergência?";
        assertEquals("Estou no caminho das minhas metas de via", Conversa.tituloDe(longa));
        assertEquals(40, Conversa.tituloDe(longa).length());
    }

    @Test
    void instrucoesTemAsRegrasPrincipais() {
        String t = InstrucoesConsultor.TEXTO;
        assertTrue(t.startsWith("Você é o Consultor Financeiro do Nexum"));
        assertTrue(t.contains("150 palavras"));
        assertTrue(t.contains("consultor de investimentos certificado"));
        assertTrue(t.contains("<dados>"));
    }
}
