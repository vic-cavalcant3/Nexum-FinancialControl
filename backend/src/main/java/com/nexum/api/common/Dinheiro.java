package com.nexum.api.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Ajudantes para dinheiro: sempre BigDecimal com 2 casas (igual ao NUMERIC(12,2) do banco). */
public final class Dinheiro {

    public static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private Dinheiro() {
    }

    public static BigDecimal de(BigDecimal valor) {
        return valor == null ? null : valor.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal ouZero(BigDecimal valor) {
        return valor == null ? ZERO : de(valor);
    }

    /** parte / todo * 100, com 1 casa. Todo zero: 0. */
    public static BigDecimal percentual(BigDecimal parte, BigDecimal todo) {
        if (todo == null || todo.signum() == 0) {
            return BigDecimal.ZERO.setScale(1);
        }
        return parte.multiply(BigDecimal.valueOf(100)).divide(todo, 1, RoundingMode.HALF_UP);
    }
}
