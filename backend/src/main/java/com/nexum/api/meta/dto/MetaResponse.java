package com.nexum.api.meta.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

import com.nexum.api.meta.Meta;

/**
 * Meta no formato que o front usa (mesmos campos da API antiga, inclusive "id_usuario")
 * + "icone" e "percentual" (0 a 100, inteiro, arredondado para baixo: 99,9% aparece como 99%).
 */
public record MetaResponse(
        Long idMeta,
        Long idUsuario,
        String descricao,
        BigDecimal valorAlvo,
        BigDecimal valorAtual,
        BigDecimal aporteMensal,
        LocalDate dataInicio,
        LocalDate dataPrazo,
        String statusMeta,
        String icone,
        int percentual) {

    public static MetaResponse de(Meta m) {
        return new MetaResponse(m.getId(), m.getUsuarioId(), m.getDescricao(), m.getValorAlvo(), m.getValorAtual(),
                m.getAporteMensal(), m.getDataInicio(), m.getDataPrazo(), m.getStatusMeta(), m.getIcone(),
                percentual(m.getValorAtual(), m.getValorAlvo()));
    }

    static int percentual(BigDecimal atual, BigDecimal alvo) {
        if (alvo == null || alvo.signum() <= 0) {
            return 0;
        }
        int p = atual.multiply(BigDecimal.valueOf(100)).divide(alvo, 0, RoundingMode.FLOOR).intValue();
        return Math.max(0, Math.min(100, p));
    }
}
