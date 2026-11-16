package com.nexum.api.security;

import java.io.IOException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import com.nexum.api.common.ErroResponse;

import tools.jackson.databind.ObjectMapper;

/**
 * 401: chamado pelo Spring Security quando uma rota protegida é acessada sem login
 * (sem token, token inválido ou expirado). Responde no formato padrão {@code { "erro": ... }}.
 */
@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    /** Atributo da requisição onde o filtro de JWT pode deixar o motivo da recusa. */
    public static final String ATRIBUTO_MOTIVO = "nexum.auth.motivo";

    private final ObjectMapper objectMapper;

    public JsonAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        Object motivo = request.getAttribute(ATRIBUTO_MOTIVO);
        String mensagem = motivo != null ? motivo.toString() : "Autenticação necessária.";

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), new ErroResponse(mensagem));
    }
}
