package com.nexum.api.common;

import org.springframework.http.HttpStatus;

/** 400: dados enviados não fazem sentido para a regra de negócio. */
public class RequisicaoInvalidaException extends ApiException {

    public RequisicaoInvalidaException(String mensagem) {
        super(HttpStatus.BAD_REQUEST, mensagem);
    }
}
