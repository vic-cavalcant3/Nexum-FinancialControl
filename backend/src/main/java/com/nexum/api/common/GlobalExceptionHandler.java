package com.nexum.api.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Transforma qualquer exceção lançada pelos controllers em {@code { "erro": "..." }}
 * com o status HTTP certo. Assim nenhum controller precisa de try/catch.
 * <p>
 * Erros de autenticação que acontecem ANTES do controller (token ausente/inválido) são
 * tratados no pacote security ({@code JsonAuthenticationEntryPoint}), no mesmo formato.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Erros da regra de negócio (404, 409, 400...). */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErroResponse> handleApi(ApiException ex) {
        return resposta(ex.getStatus(), ex.getMessage());
    }

    /** 400: @Valid falhou. Devolve a mensagem do primeiro campo inválido. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroResponse> handleValidacao(MethodArgumentNotValidException ex) {
        FieldError campo = ex.getBindingResult().getFieldError();
        String mensagem = campo != null && campo.getDefaultMessage() != null
                ? campo.getDefaultMessage()
                : "Dados inválidos.";
        return resposta(HttpStatus.BAD_REQUEST, mensagem);
    }

    /** 400: JSON malformado ou com tipo errado (ex.: texto onde era número). */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErroResponse> handleJsonInvalido(HttpMessageNotReadableException ex) {
        return resposta(HttpStatus.BAD_REQUEST, "Corpo da requisição inválido.");
    }

    /** 400: parâmetro de URL com tipo errado (ex.: /metas/abc). */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErroResponse> handleTipoParametro(MethodArgumentTypeMismatchException ex) {
        return resposta(HttpStatus.BAD_REQUEST, "Parâmetro inválido: " + ex.getName() + ".");
    }

    /** 400: faltou parâmetro obrigatório na query string. */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErroResponse> handleParametroAusente(MissingServletRequestParameterException ex) {
        return resposta(HttpStatus.BAD_REQUEST, "Parâmetro obrigatório ausente: " + ex.getParameterName() + ".");
    }

    /** 401: falha de autenticação dentro de um controller/service. */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErroResponse> handleAutenticacao(AuthenticationException ex) {
        return resposta(HttpStatus.UNAUTHORIZED, "Autenticação necessária.");
    }

    /** 403: usuário logado, mas sem permissão (ex.: rota de admin). */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErroResponse> handleAcessoNegado(AccessDeniedException ex) {
        return resposta(HttpStatus.FORBIDDEN, "Acesso negado.");
    }

    /** 404: rota que não existe. */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErroResponse> handleRotaInexistente(NoResourceFoundException ex) {
        return resposta(HttpStatus.NOT_FOUND, "Rota não encontrada.");
    }

    /** 405: rota existe, mas não com esse método (ex.: DELETE em /api/health). */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErroResponse> handleMetodo(HttpRequestMethodNotSupportedException ex) {
        return resposta(HttpStatus.METHOD_NOT_ALLOWED, "Método não permitido.");
    }

    /** 415: corpo sem Content-Type: application/json. */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErroResponse> handleMediaType(HttpMediaTypeNotSupportedException ex) {
        return resposta(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Envie o corpo em JSON (Content-Type: application/json).");
    }

    /** 409: o banco recusou por restrição (chave única, chave estrangeira...). */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErroResponse> handleIntegridade(DataIntegrityViolationException ex) {
        log.warn("Violação de integridade: {}", ex.getMostSpecificCause().getMessage());
        return resposta(HttpStatus.CONFLICT, "Conflito com dados já existentes.");
    }

    /** 500: qualquer outra coisa. O detalhe vai só para o log, nunca para o front. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErroResponse> handleInesperado(Exception ex) {
        log.error("Erro não tratado", ex);
        return resposta(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno do servidor.");
    }

    private ResponseEntity<ErroResponse> resposta(HttpStatus status, String mensagem) {
        return ResponseEntity.status(status).body(new ErroResponse(mensagem));
    }
}
