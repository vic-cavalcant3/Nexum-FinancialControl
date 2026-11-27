package com.nexum.api.consultor;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.nexum.api.common.MensagemResponse;
import com.nexum.api.consultor.dto.ConversaDetalheResponse;
import com.nexum.api.consultor.dto.ConversaResponse;
import com.nexum.api.consultor.dto.PerguntaRequest;
import com.nexum.api.consultor.dto.RespostaConsultorResponse;
import com.nexum.api.consultor.dto.UsoResponse;
import com.nexum.api.security.UsuarioAutenticado;

/**
 * /api/consultor: todas as rotas exigem token. Cada usuário só vê as próprias conversas
 * (de outro usuário = 404). Sem ANTHROPIC_API_KEY, todas respondem 503.
 */
@RestController
@RequestMapping("/api/consultor")
public class ConsultorController {

    private final ConsultorService consultorService;

    public ConsultorController(ConsultorService consultorService) {
        this.consultorService = consultorService;
    }

    /** 200 [conversa], mais recentes primeiro. */
    @GetMapping("/conversas")
    public List<ConversaResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return consultorService.listar(usuario.id());
    }

    /** 201 conversa vazia. */
    @PostMapping("/conversas")
    @ResponseStatus(HttpStatus.CREATED)
    public ConversaResponse criar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return consultorService.criar(usuario.id());
    }

    /** 200 conversa + mensagens em ordem · 404. */
    @GetMapping("/conversas/{id}")
    public ConversaDetalheResponse buscar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        return consultorService.buscar(usuario.id(), id);
    }

    /** 200 · 404. Apaga a conversa e as mensagens. */
    @DeleteMapping("/conversas/{id}")
    public MensagemResponse excluir(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        consultorService.excluir(usuario.id(), id);
        return new MensagemResponse("Conversa apagada.");
    }

    /** 201 pergunta + resposta · 400 texto inválido · 404 · 429 limite do dia · 503 IA fora do ar. */
    @PostMapping("/conversas/{id}/mensagens")
    @ResponseStatus(HttpStatus.CREATED)
    public RespostaConsultorResponse perguntar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                               @PathVariable Long id, @Valid @RequestBody PerguntaRequest dados) {
        return consultorService.perguntar(usuario.id(), id, dados.texto());
    }

    /** 200 { usadas_hoje, limite } */
    @GetMapping("/uso")
    public UsoResponse uso(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return consultorService.uso(usuario.id());
    }
}
