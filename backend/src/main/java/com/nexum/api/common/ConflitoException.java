package com.nexum.api.common;

import org.springframework.http.HttpStatus;

/** 409: conflito com dados existentes (ex.: e-mail já cadastrado). */
public class ConflitoException extends ApiException {

    public ConflitoException(String mensagem) {
        super(HttpStatus.CONFLICT, mensagem);
    }
}
