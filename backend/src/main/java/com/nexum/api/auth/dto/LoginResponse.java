package com.nexum.api.auth.dto;

/** Resposta do login: { "token": "...", "usuario": { ... } } */
public record LoginResponse(String token, UsuarioResponse usuario) {
}
