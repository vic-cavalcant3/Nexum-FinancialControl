package com.nexum.api.auth.dto;

/** Resposta do registro: { "usuario": { ... } } (mesmo envelope da API antiga). */
public record RegistroResponse(UsuarioResponse usuario) {
}
