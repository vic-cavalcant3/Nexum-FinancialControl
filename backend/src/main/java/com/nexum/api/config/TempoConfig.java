package com.nexum.api.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Fuso horário de referência da aplicação (padrão: America/Sao_Paulo, via APP_TIMEZONE).
 * <p>
 * O banco guarda tudo em UTC, mas "novembro" para o usuário é novembro no horário dele:
 * uma despesa às 23h do dia 30/11 em São Paulo já é 01/12 em UTC. Por isso os filtros
 * por mês (resumo, relatório, orçamento) usam este fuso. O servidor do Render roda em UTC.
 */
@Configuration
public class TempoConfig {

    @Bean
    public ZoneId fusoHorario(@Value("${app.fuso-horario}") String fuso) {
        return ZoneId.of(fuso);
    }

    /** Relógio no fuso da aplicação: use LocalDate.now(clock) em vez de LocalDate.now(). */
    @Bean
    public Clock clock(ZoneId fusoHorario) {
        return Clock.system(fusoHorario);
    }
}
