package com.nexum.api.transacao.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import com.nexum.api.categoria.dto.CategoriaResponse;
import com.nexum.api.transacao.Transacao;

/**
 * Transação no formato que o front usa:
 * { id_transacao, usuario_id, categoria_id, tipo, descricao, valor, data, conta, criado_em, categoria }
 * "categoria" vem completa (ou null) para o front mostrar o nome sem outra requisição.
 */
public record TransacaoResponse(
        Long idTransacao,
        Long usuarioId,
        Long categoriaId,
        String tipo,
        String descricao,
        BigDecimal valor,
        OffsetDateTime data,
        String conta,
        OffsetDateTime criadoEm,
        CategoriaResponse categoria) {

    public static TransacaoResponse de(Transacao t) {
        return new TransacaoResponse(
                t.getId(),
                t.getUsuarioId(),
                t.getCategoria() == null ? null : t.getCategoria().getId(),
                t.getTipo().valor(),
                t.getDescricao(),
                t.getValor(),
                t.getData(),
                t.getConta(),
                t.getCriadoEm(),
                CategoriaResponse.de(t.getCategoria()));
    }
}
