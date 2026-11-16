package com.nexum.api.transacao;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.nexum.api.common.MensagemResponse;
import com.nexum.api.security.UsuarioAutenticado;
import com.nexum.api.transacao.TransacaoService.Listagem;
import com.nexum.api.transacao.TransacaoService.ParametrosListagem;
import com.nexum.api.transacao.dto.RelatorioResponse;
import com.nexum.api.transacao.dto.ResumoResponse;
import com.nexum.api.transacao.dto.TransacaoRequest;
import com.nexum.api.transacao.dto.TransacaoResponse;

/** /api/transacoes: todas as rotas exigem token e só enxergam as transações do usuário logado. */
@RestController
@RequestMapping("/api/transacoes")
public class TransacaoController {

    private final TransacaoService transacaoService;

    public TransacaoController(TransacaoService transacaoService) {
        this.transacaoService = transacaoService;
    }

    /**
     * 200 [transações], da mais recente para a mais antiga. Todos os filtros são opcionais:
     * mes, ano, tipo, categoria_id, categoria (id ou nome), conta, busca (descrição),
     * pagina (a partir de 1) e tamanho. Sem pagina/tamanho, devolve todas.
     * O header X-Total-Count traz o total de itens (útil com paginação).
     */
    @GetMapping
    public ResponseEntity<List<TransacaoResponse>> listar(
            @AuthenticationPrincipal UsuarioAutenticado usuario,
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer ano,
            @RequestParam(required = false) String tipo,
            @RequestParam(name = "categoria_id", required = false) Long categoriaId,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String conta,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) Integer pagina,
            @RequestParam(required = false) Integer tamanho) {
        Listagem listagem = transacaoService.listar(usuario.id(),
                new ParametrosListagem(mes, ano, tipo, categoriaId, categoria, conta, busca, pagina, tamanho));
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(listagem.total()))
                .body(listagem.itens());
    }

    /** 200 { mes, ano, receitas, despesas, economias, saldo }. Sem mes/ano: mês atual. */
    @GetMapping("/resumo")
    public ResumoResponse resumo(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                 @RequestParam(required = false) Integer mes,
                                 @RequestParam(required = false) Integer ano) {
        return transacaoService.resumo(usuario.id(), mes, ano);
    }

    /** 200 { meses, total_receitas, total_despesas, economias, por_mes[], por_categoria[] }. */
    @GetMapping("/relatorio")
    public RelatorioResponse relatorio(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                       @RequestParam(required = false) Integer meses,
                                       @RequestParam(required = false) Integer mes,
                                       @RequestParam(required = false) Integer ano) {
        return transacaoService.relatorio(usuario.id(), meses, mes, ano);
    }

    /** 200 transação · 404 se não existe ou é de outro usuário. */
    @GetMapping("/{id}")
    public TransacaoResponse buscar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        return transacaoService.buscar(usuario.id(), id);
    }

    /** 201 transação criada. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransacaoResponse criar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                   @Valid @RequestBody TransacaoRequest dados) {
        return transacaoService.criar(usuario.id(), dados);
    }

    /** 200 transação atualizada · 404. */
    @PutMapping("/{id}")
    public TransacaoResponse atualizar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id,
                                       @Valid @RequestBody TransacaoRequest dados) {
        return transacaoService.atualizar(usuario.id(), id, dados);
    }

    /** 200 { mensagem } · 404. */
    @DeleteMapping("/{id}")
    public MensagemResponse excluir(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable Long id) {
        transacaoService.excluir(usuario.id(), id);
        return new MensagemResponse("Transação removida.");
    }
}
