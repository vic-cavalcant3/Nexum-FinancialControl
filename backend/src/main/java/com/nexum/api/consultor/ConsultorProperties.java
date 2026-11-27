package com.nexum.api.consultor;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuração do Consultor IA (app.consultor.* no application.yml, vindo de variáveis de ambiente).
 *
 * @param apiKey          ANTHROPIC_API_KEY. Vazia = consultor desligado (rotas respondem 503).
 * @param modelo          ANTHROPIC_MODEL (padrão claude-haiku-5-5).
 * @param limiteDiario    CONSULTOR_LIMITE_DIARIO: perguntas por usuário por dia (padrão 20).
 * @param maxTokens       CONSULTOR_MAX_TOKENS: tamanho máximo da resposta (padrão 800).
 * @param timeoutSegundos tempo máximo de espera pela Anthropic (60 s).
 */
@ConfigurationProperties(prefix = "app.consultor")
public record ConsultorProperties(String apiKey, String modelo, int limiteDiario, long maxTokens, long timeoutSegundos) {

    public ConsultorProperties {
        modelo = modelo == null || modelo.isBlank() ? "claude-haiku-5-5" : modelo.trim();
        limiteDiario = limiteDiario <= 0 ? 20 : limiteDiario;
        maxTokens = maxTokens <= 0 ? 800 : maxTokens;
        timeoutSegundos = timeoutSegundos <= 0 ? 60 : timeoutSegundos;
    }

    public boolean temChave() {
        return apiKey != null && !apiKey.isBlank();
    }

    /** Nunca mostra a chave (o toString padrão do record mostraria). */
    @Override
    public String toString() {
        return "ConsultorProperties[apiKey=" + (temChave() ? "***" : "(vazia)") + ", modelo=" + modelo
                + ", limiteDiario=" + limiteDiario + ", maxTokens=" + maxTokens
                + ", timeoutSegundos=" + timeoutSegundos + "]";
    }
}
