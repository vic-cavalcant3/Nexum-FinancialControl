package com.nexum.api.categoria;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexum.api.categoria.dto.CategoriaAtualizarRequest;
import com.nexum.api.categoria.dto.CategoriaRequest;
import com.nexum.api.categoria.dto.CategoriaResponse;
import com.nexum.api.common.ApiException;
import com.nexum.api.common.ConflitoException;
import com.nexum.api.common.RecursoNaoEncontradoException;
import com.nexum.api.common.TipoTransacao;

/**
 * Regras das categorias. Outros módulos (transação, orçamento) usam {@link #buscarVisivel}
 * para validar a categoria que o usuário mandou.
 */
@Service
public class CategoriaService {

    static final String NAO_ENCONTRADA = "Categoria não encontrada.";
    static final String NOME_REPETIDO = "Você já tem uma categoria com esse nome e tipo.";
    static final String EM_USO = "Essa categoria tem transações. Mova ou apague as transações antes.";

    private final CategoriaRepository categoriaRepository;

    public CategoriaService(CategoriaRepository categoriaRepository) {
        this.categoriaRepository = categoriaRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoriaResponse> listar(Long usuarioId) {
        return categoriaRepository.listarVisiveis(usuarioId).stream().map(CategoriaResponse::de).toList();
    }

    @Transactional
    public CategoriaResponse criar(Long usuarioId, CategoriaRequest dados) {
        String nome = dados.nome().trim();
        TipoTransacao tipo = TipoTransacao.de(dados.tipo());

        // Bloqueia também nome igual a uma categoria padrão ("Lazer" duas vezes na lista confunde).
        if (categoriaRepository.existeVisivel(usuarioId, nome, tipo)) {
            throw new ConflitoException(NOME_REPETIDO);
        }

        Categoria categoria = new Categoria(usuarioId, nome, tipo, textoOpcional(dados.icone()),
                textoOpcional(dados.descricao()));
        try {
            categoriaRepository.saveAndFlush(categoria);
        } catch (DataIntegrityViolationException e) {
            throw new ConflitoException(NOME_REPETIDO);
        }
        return CategoriaResponse.de(categoria);
    }

    /** Edita nome, descrição e ícone de uma categoria do próprio usuário. */
    @Transactional
    public CategoriaResponse atualizar(Long usuarioId, Long categoriaId, CategoriaAtualizarRequest dados) {
        Categoria categoria = buscarVisivel(usuarioId, categoriaId);
        if (categoria.isPadrao()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Categorias padrão não podem ser editadas.");
        }

        String nome = dados.nome().trim();
        if (categoriaRepository.existeVisivelOutra(usuarioId, nome, categoria.getTipo(), categoriaId)) {
            throw new ConflitoException(NOME_REPETIDO);
        }

        categoria.atualizar(nome, textoOpcional(dados.descricao()), textoOpcional(dados.icone()));
        try {
            categoriaRepository.saveAndFlush(categoria);
        } catch (DataIntegrityViolationException e) {
            throw new ConflitoException(NOME_REPETIDO);
        }
        return CategoriaResponse.de(categoria);
    }

    /** "" ou só espaços vira null. */
    private static String textoOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

    @Transactional
    public void excluir(Long usuarioId, Long categoriaId) {
        Categoria categoria = categoriaRepository.findById(categoriaId)
                .filter(c -> c.visivelPara(usuarioId))
                .orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));

        if (categoria.isPadrao()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Categorias padrão não podem ser excluídas.");
        }

        if (categoriaRepository.contarTransacoes(categoriaId) > 0) {
            throw new ConflitoException(EM_USO);
        }

        // Os limites de orçamento dessa categoria somem junto (ON DELETE CASCADE).
        categoriaRepository.delete(categoria);
    }

    /**
     * Categoria que o usuário pode usar (padrão ou dele). Se não existir ou for de outro
     * usuário: 404, sem revelar que ela existe.
     */
    @Transactional(readOnly = true)
    public Categoria buscarVisivel(Long usuarioId, Long categoriaId) {
        return categoriaRepository.findById(categoriaId)
                .filter(c -> c.visivelPara(usuarioId))
                .orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));
    }
}
