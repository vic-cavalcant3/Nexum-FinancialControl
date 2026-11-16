package com.nexum.api.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Cria e valida os tokens JWT.
 * <p>
 * O token guarda o id do usuário no "subject" (sub). Ele é assinado com JWT_SECRET (HMAC):
 * se alguém alterar o conteúdo, a assinatura deixa de bater e o token é recusado.
 * O conteúdo NÃO é criptografado (qualquer um lê em jwt.io): nunca coloque senha nele.
 */
@Service
public class JwtService {

    private static final int TAMANHO_MINIMO_SEGREDO = 32; // 256 bits, exigido pelo HMAC-SHA256

    private final SecretKey chave;
    private final Duration validade;

    public JwtService(JwtProperties propriedades) {
        String segredo = propriedades.secret();
        if (segredo == null || segredo.isBlank() || segredo.startsWith("${")) {
            throw new IllegalStateException("Defina a variável de ambiente JWT_SECRET.");
        }
        byte[] bytes = segredo.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < TAMANHO_MINIMO_SEGREDO) {
            throw new IllegalStateException("JWT_SECRET precisa ter pelo menos " + TAMANHO_MINIMO_SEGREDO
                    + " caracteres. Gere um com: openssl rand -base64 48");
        }
        if (propriedades.expirationHours() <= 0) {
            throw new IllegalStateException("JWT_EXPIRATION_HOURS precisa ser maior que zero.");
        }
        this.chave = Keys.hmacShaKeyFor(bytes);
        this.validade = Duration.ofHours(propriedades.expirationHours());
    }

    /** Gera um token novo para o usuário (usado no login). */
    public String gerarToken(UsuarioAutenticado usuario) {
        Instant agora = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(usuario.id()))
                .claim("email", usuario.email())
                .claim("papel", usuario.papel().name())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plus(validade)))
                .signWith(chave)
                .compact();
    }

    /**
     * Confere assinatura e validade e devolve o id do usuário.
     *
     * @throws io.jsonwebtoken.ExpiredJwtException se o token venceu
     * @throws JwtException se o token for inválido (assinatura errada, malformado...)
     */
    public Long extrairUsuarioId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(chave)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        try {
            return Long.valueOf(claims.getSubject());
        } catch (NumberFormatException e) {
            throw new JwtException("Subject do token não é um id válido.");
        }
    }
}
