package com.nexum.api.transacao.dto;

import java.math.BigDecimal;

/**
 * GET /api/transacoes/resumo?mes=&ano=
 * <ul>
 *   <li>receitas / despesas: totais do mês.</li>
 *   <li>economias: receitas - despesas do mês (pode ser negativo).</li>
 *   <li>saldo: saldo acumulado de todas as transações até o fim do mês ("Saldo total" da dashboard).</li>
 * </ul>
 */
public record ResumoResponse(
        int mes,
        int ano,
        BigDecimal receitas,
        BigDecimal despesas,
        BigDecimal economias,
        BigDecimal saldo) {
}
