package com.nexum.api.consultor;

/** A Anthropic não respondeu (erro, timeout, limite de uso). Vira 503 com mensagem amigável. */
public class IaIndisponivelException extends RuntimeException {

    public IaIndisponivelException(String motivo, Throwable causa) {
        super(motivo, causa);
    }
}
