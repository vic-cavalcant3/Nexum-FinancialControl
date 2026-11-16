package com.nexum.api.common;

import org.springframework.http.HttpStatus;

/**
 * Erro "esperado" da regra de negócio, com o status HTTP que deve ir para o front.
 * O {@link GlobalExceptionHandler} transforma em {@code { "erro": mensagem }}.
 * <p>
 * Use as subclasses ({@link RecursoNaoEncontradoException}, {@link ConflitoException},
 * {@link RequisicaoInvalidaException}) ou crie direto: {@code new ApiException(HttpStatus.FORBIDDEN, "...")}.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String mensagem) {
        super(mensagem);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
