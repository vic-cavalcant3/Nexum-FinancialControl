package com.nexum.api.admin.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Números do painel de admin. Os nomes com dígitos levam @JsonProperty porque o SNAKE_CASE
 * automático geraria "novos_ultimos30_dias" (sem "_" antes do número).
 * {@code cadastrosPorMes}: os últimos 12 meses, do mais antigo ao atual (meses sem cadastro vêm com 0).
 */
public record EstatisticasResponse(
        long totalUsuarios,
        @JsonProperty("novos_ultimos_30_dias") long novosUltimos30Dias,
        @JsonProperty("ativos_ultimos_7_dias") long ativosUltimos7Dias,
        long totalTransacoes,
        long totalMetas,
        List<CadastrosMesResponse> cadastrosPorMes) {
}
