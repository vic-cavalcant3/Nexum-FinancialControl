package com.nexum.api.auth.dto;

import com.nexum.api.usuario.Usuario;

/**
 * Usuário como o front conhece: { "id_usuario", "nome", "email" }.
 * Nunca inclui o hash da senha.
 */
public record UsuarioResponse(Long idUsuario, String nome, String email) {

    public static UsuarioResponse de(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail());
    }
}
