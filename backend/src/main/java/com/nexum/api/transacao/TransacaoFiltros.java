package com.nexum.api.transacao;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import com.nexum.api.categoria.Categoria;
import com.nexum.api.common.TipoTransacao;

/**
 * Filtros da listagem de transações, já convertidos e validados pelo service.
 * Campo null = sem filtro. Vira um "WHERE" dinâmico via {@link #paraSpecification}.
 */
record TransacaoFiltros(
        Long usuarioId,
        OffsetDateTime inicio,       // data >= inicio
        OffsetDateTime fim,          // data < fim
        TipoTransacao tipo,
        Long categoriaId,
        String categoriaNome,        // nome, sem diferenciar maiúsculas
        String conta,
        String busca) {              // trecho da descrição

    Specification<Transacao> paraSpecification() {
        return (raiz, consulta, cb) -> {
            List<Predicate> condicoes = new ArrayList<>();
            // Sempre: só as transações do usuário logado.
            condicoes.add(cb.equal(raiz.get("usuarioId"), usuarioId));

            if (inicio != null) {
                condicoes.add(cb.greaterThanOrEqualTo(raiz.get("data"), inicio));
            }
            if (fim != null) {
                condicoes.add(cb.lessThan(raiz.get("data"), fim));
            }
            if (tipo != null) {
                condicoes.add(cb.equal(raiz.get("tipo"), tipo));
            }
            if (categoriaId != null) {
                condicoes.add(cb.equal(raiz.get("categoria").get("id"), categoriaId));
            }
            if (categoriaNome != null) {
                Join<Transacao, Categoria> categoria = raiz.join("categoria", JoinType.INNER);
                condicoes.add(cb.equal(cb.lower(categoria.get("nome")), categoriaNome.toLowerCase(Locale.ROOT)));
            }
            if (conta != null) {
                condicoes.add(cb.equal(cb.lower(raiz.get("conta")), conta.toLowerCase(Locale.ROOT)));
            }
            if (busca != null) {
                // % e _ são curingas no LIKE: escapa para buscar o texto literal.
                String termo = busca.toLowerCase(Locale.ROOT)
                        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
                condicoes.add(cb.like(cb.lower(raiz.get("descricao")), "%" + termo + "%", '\\'));
            }
            return cb.and(condicoes.toArray(new Predicate[0]));
        };
    }
}
