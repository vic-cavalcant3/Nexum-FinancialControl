package com.nexum.api.consultor.dto;

import java.time.OffsetDateTime;

import com.nexum.api.consultor.Mensagem;

/** { "id", "papel": "USER"|"ASSISTANT", "conteudo", "criado_em" } */
public record MensagemResponse(Long id, String papel, String conteudo, OffsetDateTime criadoEm) {

    public static MensagemResponse de(Mensagem m) {
        return new MensagemResponse(m.getId(), m.getPapel().name(), m.getConteudo(), m.getCriadoEm());
    }
}
