package com.nexum.api.common;

import org.springframework.http.HttpStatus;

/** 404: o registro não existe (ou não é do usuário logado). */
public class RecursoNaoEncontradoException extends ApiException {

    public RecursoNaoEncontradoException(String mensagem) {
        super(HttpStatus.NOT_FOUND, mensagem);
    }
}
