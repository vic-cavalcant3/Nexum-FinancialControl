package com.nexum.api.categoria.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** POST /api/categorias: { "nome", "tipo": "receita"|"despesa", "icone"?, "descricao"? } */
public record CategoriaRequest(
        @NotBlank(message = "Informe o nome da categoria.")
        @Size(max = 60, message = "O nome da categoria pode ter no máximo 60 caracteres.")
        String nome,

        @NotBlank(message = "Informe o tipo: receita ou despesa.")
        @Pattern(regexp = "(?i)\s*(receita|despesa)\s*", message = "Tipo inválido: use receita ou despesa.")
        String tipo,

        @Size(max = 50, message = "O ícone pode ter no máximo 50 caracteres.")
        String icone,

        @Size(max = 60, message = "A descrição pode ter no máximo 60 caracteres.")
        String descricao) {
}
