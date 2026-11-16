package com.nexum.api.common;

/**
 * Formato único de erro da API: {@code { "erro": "mensagem em português" }}.
 * É o formato que o front já espera (ele lê {@code data.erro}).
 */
public record ErroResponse(String erro) {
}
