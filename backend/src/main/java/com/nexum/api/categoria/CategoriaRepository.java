package com.nexum.api.categoria;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nexum.api.common.TipoTransacao;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    /** Padrão (usuario_id nulo) + as do usuário, por nome. */
    @Query("""
            select c from Categoria c
            where c.usuarioId is null or c.usuarioId = :usuarioId
            order by c.nome, c.tipo
            """)
    List<Categoria> listarVisiveis(@Param("usuarioId") Long usuarioId);

    /** Mesmas do listarVisiveis, só de um tipo. */
    @Query("""
            select c from Categoria c
            where (c.usuarioId is null or c.usuarioId = :usuarioId) and c.tipo = :tipo
            order by c.nome
            """)
    List<Categoria> listarVisiveisPorTipo(@Param("usuarioId") Long usuarioId, @Param("tipo") TipoTransacao tipo);

    /** Já existe (padrão ou do usuário) uma categoria com esse nome e tipo, sem diferenciar maiúsculas? */
    @Query("""
            select count(c) > 0 from Categoria c
            where (c.usuarioId is null or c.usuarioId = :usuarioId)
              and lower(c.nome) = lower(:nome) and c.tipo = :tipo
            """)
    boolean existeVisivel(@Param("usuarioId") Long usuarioId, @Param("nome") String nome,
                          @Param("tipo") TipoTransacao tipo);

    /** Igual ao existeVisivel, ignorando a própria categoria (edição). */
    @Query("""
            select count(c) > 0 from Categoria c
            where (c.usuarioId is null or c.usuarioId = :usuarioId)
              and lower(c.nome) = lower(:nome) and c.tipo = :tipo and c.id <> :ignorarId
            """)
    boolean existeVisivelOutra(@Param("usuarioId") Long usuarioId, @Param("nome") String nome,
                               @Param("tipo") TipoTransacao tipo, @Param("ignorarId") Long ignorarId);

    /** Quantas transações usam a categoria (de qualquer usuário: só o dono consegue usar a dele). */
    @Query(value = "select count(*) from transacao where categoria_id = :categoriaId", nativeQuery = true)
    long contarTransacoes(@Param("categoriaId") Long categoriaId);
}
