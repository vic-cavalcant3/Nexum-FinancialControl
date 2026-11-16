package com.nexum.api.orcamento;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.nexum.api.orcamento.dto.OrcamentoRequest;
import com.nexum.api.orcamento.dto.OrcamentoResponse;
import com.nexum.api.security.UsuarioAutenticado;

/** /api/orcamentos: planejamento mensal por categoria. Exige token. */
@RestController
@RequestMapping("/api/orcamentos")
public class OrcamentoController {

    private final OrcamentoService orcamentoService;

    public OrcamentoController(OrcamentoService orcamentoService) {
        this.orcamentoService = orcamentoService;
    }

    /** 200 orçamento do mês com o gasto de cada categoria. Sem mes/ano: mês atual. */
    @GetMapping
    public OrcamentoResponse consultar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                       @RequestParam(required = false) Integer mes,
                                       @RequestParam(required = false) Integer ano) {
        return orcamentoService.consultar(usuario.id(), mes, ano);
    }

    /** 200 orçamento salvo · 400 validação · 404 categoria que não é do usuário. */
    @PutMapping
    public OrcamentoResponse definir(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                     @Valid @RequestBody OrcamentoRequest dados) {
        return orcamentoService.definir(usuario.id(), dados);
    }
}
