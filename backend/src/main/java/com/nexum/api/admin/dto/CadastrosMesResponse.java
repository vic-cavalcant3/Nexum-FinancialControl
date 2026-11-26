package com.nexum.api.admin.dto;

/** Quantos usuários se cadastraram no mês: { ano, mes, total } (mes de 1 a 12). */
public record CadastrosMesResponse(int ano, int mes, long total) {
}
