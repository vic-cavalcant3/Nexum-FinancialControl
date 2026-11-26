package com.nexum.api.auth;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexum.api.auth.dto.LoginRequest;
import com.nexum.api.auth.dto.LoginResponse;
import com.nexum.api.auth.dto.PerfilRequest;
import com.nexum.api.auth.dto.RegistrarRequest;
import com.nexum.api.auth.dto.TrocarSenhaRequest;
import com.nexum.api.auth.dto.UsuarioResponse;
import com.nexum.api.common.ApiException;
import com.nexum.api.common.ConflitoException;
import com.nexum.api.common.RecursoNaoEncontradoException;
import com.nexum.api.common.RequisicaoInvalidaException;
import com.nexum.api.security.JwtService;
import com.nexum.api.security.UsuarioAutenticado;
import com.nexum.api.usuario.PapelService;
import com.nexum.api.usuario.Usuario;
import com.nexum.api.usuario.UsuarioRepository;

/**
 * Regras de cadastro, login e conta do usuário.
 * Todo método que recebe {@code usuarioId} recebe o id que veio do TOKEN (via controller).
 */
@Service
public class AuthService {

    static final String EMAIL_JA_CADASTRADO = "E-mail já cadastrado";
    static final String CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PapelService papelService;
    private final Clock clock;

    public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager, JwtService jwtService,
                       PapelService papelService, Clock clock) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.papelService = papelService;
        this.clock = clock;
    }

    @Transactional
    public UsuarioResponse registrar(RegistrarRequest dados) {
        String email = normalizarEmail(dados.email());
        if (usuarioRepository.existsByEmail(email)) {
            throw new ConflitoException(EMAIL_JA_CADASTRADO);
        }

        Usuario usuario = new Usuario(dados.nome().trim(), email, passwordEncoder.encode(dados.senha()));
        papelService.aplicar(usuario);
        try {
            usuarioRepository.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException e) {
            // Dois cadastros com o mesmo e-mail ao mesmo tempo: o UNIQUE do banco barra o segundo.
            throw new ConflitoException(EMAIL_JA_CADASTRADO);
        }
        return UsuarioResponse.de(usuario);
    }

    @Transactional
    public LoginResponse login(LoginRequest dados) {
        Authentication autenticacao;
        try {
            // Busca pelo e-mail (UsuarioDetailsService) e confere a senha com BCrypt.
            autenticacao = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(normalizarEmail(dados.email()), dados.senha()));
        } catch (AuthenticationException e) {
            // Mesma mensagem para e-mail inexistente, senha errada ou conta desativada:
            // não revela quais e-mails estão cadastrados.
            throw new ApiException(HttpStatus.UNAUTHORIZED, CREDENCIAIS_INVALIDAS);
        }

        UsuarioAutenticado logado = (UsuarioAutenticado) autenticacao.getPrincipal();
        Usuario usuario = buscar(logado.id());
        // ADMIN_EMAILS pode ter mudado desde o cadastro: recalcula o papel a cada login.
        papelService.aplicar(usuario);
        usuarioRepository.registrarAcesso(usuario.getId(), OffsetDateTime.now(clock).withOffsetSameInstant(ZoneOffset.UTC));
        return new LoginResponse(jwtService.gerarToken(UsuarioAutenticado.de(usuario)), UsuarioResponse.de(usuario));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse me(Long usuarioId) {
        return UsuarioResponse.de(buscar(usuarioId));
    }

    @Transactional
    public UsuarioResponse atualizarPerfil(Long usuarioId, PerfilRequest dados) {
        Usuario usuario = buscar(usuarioId);
        String email = normalizarEmail(dados.email());

        if (!email.equals(usuario.getEmail()) && usuarioRepository.existsByEmail(email)) {
            throw new ConflitoException(EMAIL_JA_CADASTRADO);
        }

        usuario.setNome(dados.nome().trim());
        usuario.setEmail(email);
        papelService.aplicar(usuario);
        try {
            usuarioRepository.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException e) {
            throw new ConflitoException(EMAIL_JA_CADASTRADO);
        }
        return UsuarioResponse.de(usuario);
    }

    @Transactional
    public void trocarSenha(Long usuarioId, TrocarSenhaRequest dados) {
        Usuario usuario = buscar(usuarioId);
        // 400 (e não 401): o front trata 401 como "sessão inválida" e desloga.
        if (!passwordEncoder.matches(dados.senhaAtual(), usuario.getSenhaHash())) {
            throw new RequisicaoInvalidaException("Senha atual incorreta.");
        }
        usuario.setSenhaHash(passwordEncoder.encode(dados.novaSenha()));
    }

    private Usuario buscar(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
    }

    private static String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
