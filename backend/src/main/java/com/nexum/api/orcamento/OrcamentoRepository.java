package com.nexum.api.orcamento;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Toda consulta filtra por usuarioId. */
public interface OrcamentoRepository extends JpaRepository<Orcamento, Long> {

    @EntityGraph(attributePaths = "categoria")
    List<Orcamento> findByUsuarioIdAndMesReferencia(Long usuarioId, LocalDate mesReferencia);

    /** Último mês ANTES de {@code mes} em que o usuário definiu orçamento (null se nunca definiu). */
    @Query("select max(o.mesReferencia) from Orcamento o where o.usuarioId = :usuarioId and o.mesReferencia < :mes")
    LocalDate ultimoMesAntes(@Param("usuarioId") Long usuarioId, @Param("mes") LocalDate mes);

    /** Apaga o orçamento inteiro de um mês (usado antes de gravar o novo). */
    @Modifying
    @Query("delete from Orcamento o where o.usuarioId = :usuarioId and o.mesReferencia = :mes")
    int apagarDoMes(@Param("usuarioId") Long usuarioId, @Param("mes") LocalDate mes);
}
