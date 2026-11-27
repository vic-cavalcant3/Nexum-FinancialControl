package com.nexum.api.categoria.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * PUT /api/categorias/{id}: { "nome", "descricao"?, "icone"? }.
 * O tipo não muda (as transações e o orçamento já usam a categoria com esse tipo).
 */
public record CategoriaAtualizarRequest(
        @NotBlank(message = "Informe o nome da categoria.")
        @Size(max = 60, message = "O nome da categoria pode ter no máximo 60 caracteres.")
        String nome,

        @Size(max = 60, message = "A descrição pode ter no máximo 60 caracteres.")
        String descricao,

        @Size(max = 50, message = "O ícone pode ter no máximo 50 caracteres.")
        String icone) {
}
