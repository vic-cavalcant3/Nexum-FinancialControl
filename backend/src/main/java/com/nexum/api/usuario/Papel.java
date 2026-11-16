package com.nexum.api.usuario;

/**
 * Papel (perfil de acesso) do usuário. Salvo como texto na coluna usuario.papel.
 * No Spring Security vira a "authority" ROLE_USER ou ROLE_ADMIN.
 */
public enum Papel {
    USER,
    ADMIN
}
