package com.nexum.api.transacao.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * GET /api/transacoes/relatorio?meses=6: o que as telas de Dashboard e Relatórios desenham.
 * <ul>
 *   <li>por_mes: um item por mês do período, do mais antigo ao atual (gráfico Receitas x Despesas).</li>
 *   <li>por_categoria: despesas do período por categoria, da maior para a menor (ranking
 *       "Onde seu dinheiro mais foi").</li>
 * </ul>
 */
public record RelatorioResponse(
        int meses,
        BigDecimal totalReceitas,
        BigDecimal totalDespesas,
        BigDecimal economias,
        List<Mes> porMes,
        List<Categoria> porCategoria) {

    public record Mes(int mes, int ano, BigDecimal receitas, BigDecimal despesas, BigDecimal economias) {
    }

    /** categoria_id null = transações sem categoria ("Sem categoria"). percentual = % do total de despesas. */
    public record Categoria(Long categoriaId, String nome, String icone, BigDecimal total, BigDecimal percentual) {
    }
}
