package com.nexum.api.auth;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.nexum.api.auth.dto.LoginRequest;
import com.nexum.api.auth.dto.LoginResponse;
import com.nexum.api.auth.dto.PerfilRequest;
import com.nexum.api.auth.dto.RegistrarRequest;
import com.nexum.api.auth.dto.RegistroResponse;
import com.nexum.api.auth.dto.TrocarSenhaRequest;
import com.nexum.api.auth.dto.UsuarioResponse;
import com.nexum.api.common.MensagemResponse;
import com.nexum.api.security.UsuarioAutenticado;

/**
 * Rotas de autenticação. Públicas: registrar e login. As demais exigem token.
 * O usuário logado vem do token ({@code @AuthenticationPrincipal}), nunca do corpo da requisição.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** 201 { usuario } · 409 se o e-mail já existe. */
    @PostMapping("/registrar")
    @ResponseStatus(HttpStatus.CREATED)
    public RegistroResponse registrar(@Valid @RequestBody RegistrarRequest dados) {
        return new RegistroResponse(authService.registrar(dados));
    }

    /** 200 { token, usuario } · 401 se e-mail/senha não batem. */
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest dados) {
        return authService.login(dados);
    }

    /** 200 { id_usuario, nome, email } do dono do token. */
    @GetMapping("/me")
    public UsuarioResponse me(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return authService.me(usuario.id());
    }

    /** 200 { id_usuario, nome, email } atualizado · 409 se o novo e-mail já é de outra conta. */
    @PutMapping("/perfil")
    public UsuarioResponse atualizarPerfil(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                           @Valid @RequestBody PerfilRequest dados) {
        return authService.atualizarPerfil(usuario.id(), dados);
    }

    /** 200 { mensagem } · 400 se a senha atual estiver errada. */
    @PutMapping("/trocar-senha")
    public MensagemResponse trocarSenha(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                        @Valid @RequestBody TrocarSenhaRequest dados) {
        authService.trocarSenha(usuario.id(), dados);
        return new MensagemResponse("Senha alterada com sucesso.");
    }
}
