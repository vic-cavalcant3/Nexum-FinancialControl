package com.nexum.api.consultor.dto;

/**
 * POST /api/consultor/conversas/{id}/mensagens: a pergunta salva, a resposta do Claude,
 * a conversa atualizada (título) e o uso do dia.
 */
public record RespostaConsultorResponse(MensagemResponse pergunta, MensagemResponse resposta,
                                        ConversaResponse conversa, UsoResponse uso) {
}
