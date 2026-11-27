package com.nexum.api.consultor;

import java.util.List;

/**
 * Quem responde as perguntas do Consultor. Em produção é o {@link AnthropicClienteIa} (API do Claude);
 * nos testes é um mock, então nenhum teste chama a API de verdade.
 */
public interface ClienteIa {

    /** false quando ANTHROPIC_API_KEY não está configurada: as rotas do consultor respondem 503. */
    boolean disponivel();

    /**
     * Pede uma resposta ao modelo.
     *
     * @param instrucoes system prompt fixo (regras do consultor)
     * @param dados      bloco de DADOS do usuário, gerado na hora
     * @param mensagens  histórico em ordem, começando por USER e terminando na pergunta nova
     * @throws IaIndisponivelException se a Anthropic falhar, demorar demais ou recusar por limite
     */
    RespostaIa responder(String instrucoes, String dados, List<MensagemIa> mensagens);

    record MensagemIa(PapelMensagem papel, String texto) {
    }

    record RespostaIa(String texto, Integer tokensEntrada, Integer tokensSaida) {
    }
}
