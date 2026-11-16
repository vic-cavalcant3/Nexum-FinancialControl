package com.nexum.api.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuração do JWT, lida de {@code app.jwt} no application.yml
 * (variáveis JWT_SECRET e JWT_EXPIRATION_HOURS).
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, long expirationHours) {
}
