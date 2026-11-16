package com.nexum.api.common;

import java.util.Locale;

/**
 * Tipo de categoria e de transação. No Java é RECEITA/DESPESA; no banco e no JSON é
 * "receita"/"despesa" (minúsculo), que é o que o front compara.
 */
public enum TipoTransacao {
    RECEITA("receita"),
    DESPESA("despesa");

    private final String valor;

    TipoTransacao(String valor) {
        this.valor = valor;
    }

    /** "receita" ou "despesa". */
    public String valor() {
        return valor;
    }

    /** Aceita "receita", "RECEITA", " Despesa "... Qualquer outra coisa: 400. */
    public static TipoTransacao de(String texto) {
        if (texto != null) {
            String t = texto.trim().toLowerCase(Locale.ROOT);
            for (TipoTransacao tipo : values()) {
                if (tipo.valor.equals(t)) {
                    return tipo;
                }
            }
        }
        throw new RequisicaoInvalidaException("Tipo inválido: use receita ou despesa.");
    }
}
