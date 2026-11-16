package com.nexum.api.orcamento.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * GET/PUT /api/orcamentos: tudo o que a tela de Planejamento mostra.
 * <ul>
 *   <li>categorias: TODAS as categorias de despesa do usuário. As que têm "limite" fazem parte
 *       do orçamento; as com limite null são as que o modal "Nova categoria" oferece.</li>
 *   <li>gasto: despesas do mês naquela categoria. percentual: gasto / limite (null sem limite).</li>
 *   <li>total_orcado: soma dos limites. total_gasto: TODAS as despesas do mês (inclusive
 *       sem categoria ou em categorias sem limite).</li>
 *   <li>herdado: true quando o mês ainda não tem orçamento próprio e os limites vieram do
 *       último mês planejado. Salvar (PUT) grava o mês.</li>
 * </ul>
 */
public record OrcamentoResponse(
        int mes,
        int ano,
        boolean herdado,
        BigDecimal totalOrcado,
        BigDecimal totalGasto,
        List<Item> categorias) {

    public record Item(Long categoriaId, String nome, String icone, BigDecimal limite, BigDecimal gasto,
                       Integer percentual) {
    }
}
