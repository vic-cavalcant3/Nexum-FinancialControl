package com.nexum.api.transacao.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * POST e PUT /api/transacoes:
 * { "tipo", "descricao", "valor", "data", "categoria_id", "conta" }
 * <ul>
 *   <li>data: "2026-11-16" ou ISO completo ("2026-11-16T13:15:00.000Z", que é o que o front manda).</li>
 *   <li>categoria_id: opcional (null = sem categoria). Se vier, tem que ser do mesmo tipo.</li>
 *   <li>conta: opcional. No PUT, se não vier (null), mantém a atual.</li>
 * </ul>
 */
public record TransacaoRequest(
        @NotBlank(message = "Informe o tipo: receita ou despesa.")
        @Pattern(regexp = "(?i)\\s*(receita|despesa)\\s*", message = "Tipo inválido: use receita ou despesa.")
        String tipo,

        @Size(max = 255, message = "A descrição pode ter no máximo 255 caracteres.")
        String descricao,

        @NotNull(message = "Informe o valor.")
        @DecimalMin(value = "0", inclusive = false, message = "O valor deve ser maior que zero.")
        @DecimalMax(value = "9999999999.99", message = "Valor muito alto.")
        BigDecimal valor,

        @NotBlank(message = "Informe a data.")
        String data,

        Long categoriaId,

        @Size(max = 30, message = "A conta pode ter no máximo 30 caracteres.")
        String conta) {
}
