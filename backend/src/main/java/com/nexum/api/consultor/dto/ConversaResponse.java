package com.nexum.api.consultor.dto;

import java.time.OffsetDateTime;

import com.nexum.api.consultor.Conversa;

/** { "id", "titulo" (null até a primeira pergunta), "atualizado_em" } */
public record ConversaResponse(Long id, String titulo, OffsetDateTime atualizadoEm) {

    public static ConversaResponse de(Conversa c) {
        return new ConversaResponse(c.getId(), c.getTitulo(), c.getAtualizadoEm());
    }
}
