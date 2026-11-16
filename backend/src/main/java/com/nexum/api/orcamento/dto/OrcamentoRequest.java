package com.nexum.api.orcamento.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * PUT /api/orcamentos: define o orçamento INTEIRO de um mês (é o que o modal "Editar
 * orçamento" salva). Categoria que não estiver na lista fica sem limite naquele mês.
 * <pre>
 * { "mes": 11, "ano": 2026, "limites": [ { "categoria_id": 3, "limite": 900 }, ... ] }
 * </pre>
 */
public record OrcamentoRequest(
        @NotNull(message = "Informe o mês.")
        Integer mes,

        @NotNull(message = "Informe o ano.")
        Integer ano,

        @NotNull(message = "Informe os limites.")
        @Size(max = 200, message = "Limites demais.")
        List<@Valid @NotNull(message = "Limite vazio na lista.") Limite> limites) {

    public record Limite(
            @NotNull(message = "Informe a categoria do limite.")
            Long categoriaId,

            @NotNull(message = "Informe o limite.")
            @DecimalMin(value = "0", message = "O limite não pode ser negativo.")
            @DecimalMax(value = "9999999999.99", message = "Limite muito alto.")
            BigDecimal limite) {
    }
}
