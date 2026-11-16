package com.nexum.api.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Acesso à tabela usuario. O Spring Data gera a implementação a partir do nome dos métodos.
 * O e-mail é sempre salvo e buscado em minúsculas (ver AuthService).
 */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);
}
