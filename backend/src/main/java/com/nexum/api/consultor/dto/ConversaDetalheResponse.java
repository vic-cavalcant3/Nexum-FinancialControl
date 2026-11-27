package com.nexum.api.consultor.dto;

import java.time.OffsetDateTime;
import java.util.List;

/** GET /api/consultor/conversas/{id}: a conversa + as mensagens em ordem. */
public record ConversaDetalheResponse(Long id, String titulo, OffsetDateTime atualizadoEm,
                                      List<MensagemResponse> mensagens) {
}
