package com.nexum.api;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Sobe um Postgres 16 descartável (Docker) para os testes.
 * O @ServiceConnection faz o Spring usar esse banco no lugar de DB_URL/DB_USER/DB_PASSWORD.
 * O Flyway roda as migrations nele, igual em produção.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfig {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgresContainer() {
        return new PostgreSQLContainer("postgres:16-alpine");
    }
}
