package com.nexum.api.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** POST /api/auth/login: { "email", "senha" } */
public record LoginRequest(
        @NotBlank(message = "Informe o e-mail.")
        String email,

        @NotBlank(message = "Informe a senha.")
        String senha) {
}
