package com.nexum.api.categoria.dto;

import com.nexum.api.categoria.Categoria;

/**
 * { "id", "usuario_id", "nome", "tipo": "receita"|"despesa", "icone", "padrao" }
 * (mesmos campos da API antiga + "padrao": true nas categorias globais, que não podem ser apagadas).
 */
public record CategoriaResponse(Long id, Long usuarioId, String nome, String tipo, String icone, boolean padrao) {

    public static CategoriaResponse de(Categoria categoria) {
        if (categoria == null) {
            return null;
        }
        return new CategoriaResponse(categoria.getId(), categoria.getUsuarioId(), categoria.getNome(),
                categoria.getTipo().valor(), categoria.getIcone(), categoria.isPadrao());
    }
}
