package com.nexum.api.auth.dto;

import com.nexum.api.usuario.Papel;
import com.nexum.api.usuario.Usuario;

/**
 * Usuário como o front conhece: { "id_usuario", "nome", "email", "papel" }.
 * {@code papel} é "USER" ou "ADMIN" (definido por ADMIN_EMAILS). Nunca inclui o hash da senha.
 */
public record UsuarioResponse(Long idUsuario, String nome, String email, Papel papel) {

    public static UsuarioResponse de(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getPapel());
    }
}
