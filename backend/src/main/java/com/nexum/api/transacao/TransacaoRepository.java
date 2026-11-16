package com.nexum.api.transacao;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nexum.api.common.TipoTransacao;

/**
 * Acesso à tabela transacao. Toda consulta filtra por usuarioId: é isso que impede um
 * usuário de enxergar transações de outro.
 * <p>
 * {@code @EntityGraph(attributePaths = "categoria")} traz a categoria junto, no mesmo SELECT
 * (sem isso, seria 1 SELECT extra por transação: o famoso problema "N+1").
 */
public interface TransacaoRepository extends JpaRepository<Transacao, Long>, JpaSpecificationExecutor<Transacao> {

    @EntityGraph(attributePaths = "categoria")
    Optional<Transacao> findByIdAndUsuarioId(Long id, Long usuarioId);

    /** Listagem com filtros (TransacaoFiltros), sem paginação. */
    @Override
    @EntityGraph(attributePaths = "categoria")
    List<Transacao> findAll(Specification<Transacao> filtros, Sort ordem);

    /** Listagem com filtros e paginação. */
    @Override
    @EntityGraph(attributePaths = "categoria")
    Page<Transacao> findAll(Specification<Transacao> filtros, Pageable pagina);

    /** Transações do período, para o relatório (agregado no Java). */
    @EntityGraph(attributePaths = "categoria")
    @Query("""
            select t from Transacao t
            where t.usuarioId = :usuarioId and t.data >= :inicio and t.data < :fim
            """)
    List<Transacao> listarNoPeriodo(@Param("usuarioId") Long usuarioId,
                                    @Param("inicio") OffsetDateTime inicio,
                                    @Param("fim") OffsetDateTime fim);

    /** Soma de receitas e de despesas no período [inicio, fim). */
    @Query("""
            select t.tipo as tipo, sum(t.valor) as total from Transacao t
            where t.usuarioId = :usuarioId and t.data >= :inicio and t.data < :fim
            group by t.tipo
            """)
    List<TotalPorTipo> somarPorTipo(@Param("usuarioId") Long usuarioId,
                                    @Param("inicio") OffsetDateTime inicio,
                                    @Param("fim") OffsetDateTime fim);

    /** Soma de receitas e de despesas de todas as transações antes de {@code fim} (saldo acumulado). */
    @Query("""
            select t.tipo as tipo, sum(t.valor) as total from Transacao t
            where t.usuarioId = :usuarioId and t.data < :fim
            group by t.tipo
            """)
    List<TotalPorTipo> somarPorTipoAte(@Param("usuarioId") Long usuarioId, @Param("fim") OffsetDateTime fim);

    /**
     * Total por categoria de um tipo no período (usado no orçamento). A categoria pode vir
     * null: transações "sem categoria".
     */
    @Query("""
            select c.id as categoriaId, sum(t.valor) as total from Transacao t
            left join t.categoria c
            where t.usuarioId = :usuarioId and t.tipo = :tipo and t.data >= :inicio and t.data < :fim
            group by c.id
            """)
    List<TotalPorCategoria> somarPorCategoria(@Param("usuarioId") Long usuarioId,
                                              @Param("tipo") TipoTransacao tipo,
                                              @Param("inicio") OffsetDateTime inicio,
                                              @Param("fim") OffsetDateTime fim);

    /** Projeção: só os campos que a consulta devolve. */
    interface TotalPorTipo {
        TipoTransacao getTipo();

        BigDecimal getTotal();
    }

    interface TotalPorCategoria {
        Long getCategoriaId();

        BigDecimal getTotal();
    }
}
