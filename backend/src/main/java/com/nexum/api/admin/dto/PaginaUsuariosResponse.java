package com.nexum.api.admin.dto;

import java.util.List;

/**
 * Página da lista de usuários: { usuarios, pagina, tamanho, total, total_paginas }.
 * {@code pagina} começa em 0.
 */
public record PaginaUsuariosResponse(
        List<AdminUsuarioResponse> usuarios,
        int pagina,
        int tamanho,
        long total,
        int totalPaginas) {
}
