package com.nexum.api.consultor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /api/consultor/conversas/{id}/mensagens: { "texto" } */
public record PerguntaRequest(
        @NotBlank(message = "Escreva sua pergunta.")
        @Size(max = 1000, message = "A pergunta pode ter no máximo 1000 caracteres.")
        String texto) {
}
