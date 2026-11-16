package com.nexum.api.meta;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.nexum.api.common.MensagemResponse;
import com.nexum.api.meta.dto.MetaRequest;
import com.nexum.api.meta.dto.MetaResponse;
import com.nexum.api.security.UsuarioAutenticado;

/** /api/metas: todas as rotas exigem token. Meta de outro usuário → 404. */
@RestController
@RequestMapping("/api/metas")
public class MetaController {

    private final MetaService metaService;

    public MetaController(MetaService metaService) {
        this.metaService = metaService;
    }

    @GetMapping
    public List<MetaResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return metaService.listar(usuario.id());
    }

    @GetMapping("/{id}")
    public MetaResponse buscar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        return metaService.buscar(usuario.id(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MetaResponse criar(@AuthenticationPrincipal UsuarioAutenticado usuario, @Valid @RequestBody MetaRequest dados) {
        return metaService.criar(usuario.id(), dados);
    }

    @PutMapping("/{id}")
    public MetaResponse atualizar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id,
                                  @Valid @RequestBody MetaRequest dados) {
        return metaService.atualizar(usuario.id(), id, dados);
    }

    @DeleteMapping("/{id}")
    public MensagemResponse excluir(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        metaService.excluir(usuario.id(), id);
        return new MensagemResponse("Meta removida.");
    }
}
