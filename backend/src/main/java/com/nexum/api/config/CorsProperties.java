package com.nexum.api.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Origens (sites) que podem chamar a API pelo navegador.
 * Vem de {@code app.cors.origins} no application.yml, que lê a variável CORS_ORIGINS
 * (lista separada por vírgula).
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> origins) {

    public CorsProperties {
        origins = origins == null ? List.of() : origins.stream()
                .map(String::trim)
                .filter(origem -> !origem.isEmpty())
                .toList();
    }
}
