package com.nexum.api.common;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;

/**
 * Intervalo de datas meio-aberto [inicio, fim): inclui o início e exclui o fim.
 * Ex.: novembro/2026 em São Paulo = [2026-11-01T00:00-03:00, 2026-12-01T00:00-03:00).
 * Assim não há problema com "23:59:59.999" e o último segundo do mês.
 */
public record Periodo(OffsetDateTime inicio, OffsetDateTime fim) {

    /** Meses do intervalo [primeiro, ultimo], inclusive, no fuso indicado. */
    public static Periodo deMeses(YearMonth primeiro, YearMonth ultimo, ZoneId fuso) {
        return new Periodo(
                primeiro.atDay(1).atStartOfDay(fuso).toOffsetDateTime(),
                ultimo.plusMonths(1).atDay(1).atStartOfDay(fuso).toOffsetDateTime());
    }

    public static Periodo doMes(YearMonth mes, ZoneId fuso) {
        return deMeses(mes, mes, fuso);
    }

    /**
     * Converte os parâmetros ?mes=&ano= da URL num YearMonth.
     * Sem mes e sem ano: mês atual. Só ano: null (quem chama decide). Mes inválido: 400.
     */
    public static YearMonth mesAno(Integer mes, Integer ano, Clock clock) {
        YearMonth atual = YearMonth.now(clock);
        if (mes == null && ano == null) {
            return atual;
        }
        if (mes == null) {
            return null;
        }
        validarMes(mes);
        return YearMonth.of(ano != null ? validarAno(ano) : atual.getYear(), mes);
    }

    public static int validarMes(int mes) {
        if (mes < 1 || mes > 12) {
            throw new RequisicaoInvalidaException("Mês inválido: use um número de 1 a 12.");
        }
        return mes;
    }

    public static int validarAno(int ano) {
        if (ano < 2000 || ano > 2100) {
            throw new RequisicaoInvalidaException("Ano inválido.");
        }
        return ano;
    }
}
