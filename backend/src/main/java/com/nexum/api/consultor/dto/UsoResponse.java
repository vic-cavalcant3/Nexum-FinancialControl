package com.nexum.api.consultor.dto;

/** { "usadas_hoje", "limite" }: perguntas feitas hoje (desde 00:00 no fuso APP_TIMEZONE). */
public record UsoResponse(long usadasHoje, int limite) {
}
