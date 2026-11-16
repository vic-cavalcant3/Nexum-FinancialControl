package com.nexum.api.security;

import java.util.Locale;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexum.api.usuario.UsuarioRepository;

/**
 * Busca usuários no banco para o Spring Security.
 * <ul>
 *   <li>{@link #loadUserByUsername}: usado no login (o "username" aqui é o e-mail).</li>
 *   <li>{@link #carregarPorId}: usado pelo JwtAuthFilter, com o id que veio do token.</li>
 * </ul>
 */
@Service
public class UsuarioDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioDetailsService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioAutenticado loadUserByUsername(String email) {
        String emailNormalizado = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        return usuarioRepository.findByEmail(emailNormalizado)
                .map(UsuarioAutenticado::de)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado."));
    }

    @Transactional(readOnly = true)
    public UsuarioAutenticado carregarPorId(Long id) {
        return usuarioRepository.findById(id)
                .map(UsuarioAutenticado::de)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado."));
    }
}
