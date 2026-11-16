package com.nexum.api.meta.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * POST e PUT /api/metas (os campos do modal "Nova meta"):
 * { "descricao", "valor_alvo", "valor_atual", "aporte_mensal", "data_inicio", "data_prazo", "status_meta", "icone" }
 * <ul>
 *   <li>Obrigatórios: descricao (nome da meta), valor_alvo (objetivo) e data_prazo (AAAA-MM-DD).</li>
 *   <li>No POST, os opcionais têm padrão: valor_atual 0, aporte_mensal 0, data_inicio hoje,
 *       status_meta "em_andamento", sem ícone.</li>
 *   <li>No PUT, opcional que não vem (null) mantém o valor atual. icone "" remove o ícone.</li>
 * </ul>
 */
public record MetaRequest(
        @NotBlank(message = "Informe o nome da meta.")
        @Size(max = 255, message = "O nome da meta pode ter no máximo 255 caracteres.")
        String descricao,

        @NotNull(message = "Informe o valor objetivo.")
        @DecimalMin(value = "0", inclusive = false, message = "O valor objetivo deve ser maior que zero.")
        @DecimalMax(value = "9999999999.99", message = "Valor objetivo muito alto.")
        BigDecimal valorAlvo,

        @DecimalMin(value = "0", message = "O valor guardado não pode ser negativo.")
        @DecimalMax(value = "9999999999.99", message = "Valor guardado muito alto.")
        BigDecimal valorAtual,

        @DecimalMin(value = "0", message = "O aporte mensal não pode ser negativo.")
        @DecimalMax(value = "9999999999.99", message = "Aporte mensal muito alto.")
        BigDecimal aporteMensal,

        LocalDate dataInicio,

        @NotNull(message = "Informe a data prevista.")
        LocalDate dataPrazo,

        @Pattern(regexp = "em_andamento|concluida|cancelada",
                message = "Status inválido: use em_andamento, concluida ou cancelada.")
        String statusMeta,

        @Size(max = 30, message = "O ícone pode ter no máximo 30 caracteres.")
        String icone) {
}
