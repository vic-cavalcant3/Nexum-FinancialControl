package com.nexum.api.categoria;

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

import com.nexum.api.categoria.dto.CategoriaAtualizarRequest;
import com.nexum.api.categoria.dto.CategoriaRequest;
import com.nexum.api.categoria.dto.CategoriaResponse;
import com.nexum.api.common.MensagemResponse;
import com.nexum.api.security.UsuarioAutenticado;

/** /api/categorias: todas as rotas exigem token. */
@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    private final CategoriaService categoriaService;

    public CategoriaController(CategoriaService categoriaService) {
        this.categoriaService = categoriaService;
    }

    /** 200 [categorias padrão + as do usuário], por nome. */
    @GetMapping
    public List<CategoriaResponse> listar(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return categoriaService.listar(usuario.id());
    }

    /** 201 categoria · 409 nome repetido (no mesmo tipo). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoriaResponse criar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                   @Valid @RequestBody CategoriaRequest dados) {
        return categoriaService.criar(usuario.id(), dados);
    }

    /** 200 categoria · 403 categoria padrão · 404 não é do usuário · 409 nome repetido. */
    @PutMapping("/{id}")
    public CategoriaResponse atualizar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id,
                                       @Valid @RequestBody CategoriaAtualizarRequest dados) {
        return categoriaService.atualizar(usuario.id(), id, dados);
    }

    /** 200 · 403 categoria padrão · 404 não é do usuário · 409 tem transações. */
    @DeleteMapping("/{id}")
    public MensagemResponse excluir(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        categoriaService.excluir(usuario.id(), id);
        return new MensagemResponse("Categoria removida.");
    }
}
