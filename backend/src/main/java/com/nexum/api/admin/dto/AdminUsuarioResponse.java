package com.nexum.api.admin.dto;

import java.time.OffsetDateTime;

import com.nexum.api.usuario.Papel;

/**
 * Linha da lista de usuários do painel de admin:
 * { id_usuario, nome, email, papel, criado_em, ultimo_acesso, qtd_transacoes, qtd_metas }.
 * Montado direto na consulta (UsuarioRepository.listarParaAdmin). Nunca inclui a senha.
 */
public record AdminUsuarioResponse(
        Long idUsuario,
        String nome,
        String email,
        Papel papel,
        OffsetDateTime criadoEm,
        OffsetDateTime ultimoAcesso,
        Long qtdTransacoes,
        Long qtdMetas) {
}
