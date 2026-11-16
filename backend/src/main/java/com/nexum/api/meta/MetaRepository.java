package com.nexum.api.meta;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Toda consulta filtra por usuarioId: um usuário nunca enxerga a meta de outro. */
public interface MetaRepository extends JpaRepository<Meta, Long> {

    List<Meta> findByUsuarioIdOrderByDataPrazoAscIdAsc(Long usuarioId);

    Optional<Meta> findByIdAndUsuarioId(Long id, Long usuarioId);
}
