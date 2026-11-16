package com.nexum.api.categoria;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
            throw new ConflitoException("Você já tem uma categoria com esse nome e tipo.");
        }

        String icone = dados.icone() == null || dados.icone().isBlank() ? null : dados.icone().trim();
        Categoria categoria = new Categoria(usuarioId, nome, tipo, icone);
        try {
            categoriaRepository.saveAndFlush(categoria);
        } catch (DataIntegrityViolationException e) {
            throw new ConflitoException("Você já tem uma categoria com esse nome e tipo.");
        }
        return CategoriaResponse.de(categoria);
    }

    @Transactional
    public void excluir(Long usuarioId, Long categoriaId) {
        Categoria categoria = categoriaRepository.findById(categoriaId)
                .filter(c -> c.visivelPara(usuarioId))
                .orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));

        if (categoria.isPadrao()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Categorias padrão não podem ser excluídas.");
        }

        long emUso = categoriaRepository.contarTransacoes(categoriaId);
        if (emUso > 0) {
            throw new ConflitoException("Não dá para excluir a categoria \"" + categoria.getNome() + "\": "
                    + (emUso == 1 ? "1 transação usa" : emUso + " transações usam")
                    + " ela. Troque a categoria dessas transações ou exclua-as antes.");
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
