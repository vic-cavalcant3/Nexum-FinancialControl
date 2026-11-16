package com.nexum.api.security;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.nexum.api.usuario.Papel;
import com.nexum.api.usuario.Usuario;

/**
 * O usuário logado, do jeito que o Spring Security entende (UserDetails).
 * <p>
 * Nos controllers, pegue com {@code @AuthenticationPrincipal UsuarioAutenticado usuario}
 * e use {@code usuario.id()}. Esse id vem do token, nunca do front.
 */
public record UsuarioAutenticado(Long id, String email, String senhaHash, Papel papel, boolean ativo)
        implements UserDetails {

    public static UsuarioAutenticado de(Usuario usuario) {
        return new UsuarioAutenticado(usuario.getId(), usuario.getEmail(), usuario.getSenhaHash(),
                usuario.getPapel(), usuario.isAtivo());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + papel.name()));
    }

    @Override
    public String getPassword() {
        return senhaHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return ativo;
    }
}
