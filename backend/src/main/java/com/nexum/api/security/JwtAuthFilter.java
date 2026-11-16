package com.nexum.api.security;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;

/**
 * Roda uma vez em cada requisição, antes dos controllers.
 * <ol>
 *   <li>Lê o header {@code Authorization: Bearer <token>}.</li>
 *   <li>Valida assinatura e validade do token (JwtService).</li>
 *   <li>Busca o usuário pelo id do token e marca a requisição como autenticada.</li>
 * </ol>
 * Se não houver token ou ele for inválido, a requisição segue SEM usuário: rotas públicas
 * funcionam normalmente e as protegidas recebem 401 (JsonAuthenticationEntryPoint).
 * <p>
 * Não é um @Component de propósito: o Spring Boot registraria o filtro duas vezes
 * (uma no Tomcat e outra no Security). Ele é criado dentro do SecurityConfig.
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String PREFIXO = "Bearer ";

    private final JwtService jwtService;
    private final UsuarioDetailsService usuarioDetailsService;

    public JwtAuthFilter(JwtService jwtService, UsuarioDetailsService usuarioDetailsService) {
        this.jwtService = jwtService;
        this.usuarioDetailsService = usuarioDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith(PREFIXO)) {
            String token = header.substring(PREFIXO.length()).trim();
            autenticar(token, request);
        }

        filterChain.doFilter(request, response);
    }

    private void autenticar(String token, HttpServletRequest request) {
        try {
            Long usuarioId = jwtService.extrairUsuarioId(token);
            UsuarioAutenticado usuario = usuarioDetailsService.carregarPorId(usuarioId);

            if (!usuario.isEnabled()) {
                request.setAttribute(JsonAuthenticationEntryPoint.ATRIBUTO_MOTIVO, "Conta desativada.");
                return;
            }

            UsernamePasswordAuthenticationToken autenticacao =
                    UsernamePasswordAuthenticationToken.authenticated(usuario, null, usuario.getAuthorities());
            autenticacao.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(autenticacao);

        } catch (ExpiredJwtException e) {
            request.setAttribute(JsonAuthenticationEntryPoint.ATRIBUTO_MOTIVO,
                    "Sessão expirada. Faça login novamente.");
        } catch (JwtException | IllegalArgumentException e) {
            request.setAttribute(JsonAuthenticationEntryPoint.ATRIBUTO_MOTIVO, "Token inválido.");
        } catch (UsernameNotFoundException e) {
            // Token válido, mas o usuário foi apagado depois que ele foi emitido.
            request.setAttribute(JsonAuthenticationEntryPoint.ATRIBUTO_MOTIVO, "Usuário não encontrado.");
        }
    }
}
