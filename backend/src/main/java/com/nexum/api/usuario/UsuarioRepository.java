package com.nexum.api.usuario;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nexum.api.admin.dto.AdminUsuarioResponse;

/**
 * Acesso à tabela usuario. O Spring Data gera a implementação a partir do nome dos métodos.
 * O e-mail é sempre salvo e buscado em minúsculas (ver AuthService).
 */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    // ------------------------------------------------------------------ login

    /**
     * Grava o horário do login. É um UPDATE direto (e não setter na entidade) para não mexer
     * no atualizado_em: entrar no app não é "alterar a conta".
     */
    @Modifying(flushAutomatically = true)
    @Query("update Usuario u set u.ultimoAcesso = :agora where u.id = :id")
    void registrarAcesso(@Param("id") Long id, @Param("agora") OffsetDateTime agora);

    // ------------------------------------------------------------------ papéis (ADMIN_EMAILS)

    /** Dá o papel a quem está na lista (e ainda não tem). */
    @Modifying
    @Query("update Usuario u set u.papel = :papel where u.email in :emails and u.papel <> :papel")
    int definirPapel(@Param("emails") Collection<String> emails, @Param("papel") Papel papel);

    /** Rebaixa para USER os ADMIN que saíram da lista. */
    @Modifying
    @Query("update Usuario u set u.papel = :user where u.papel = :admin and u.email not in :emails")
    int rebaixarAdminsFora(@Param("emails") Collection<String> emails,
                           @Param("admin") Papel admin, @Param("user") Papel user);

    /** Lista vazia: ninguém é ADMIN. */
    @Modifying
    @Query("update Usuario u set u.papel = :user where u.papel = :admin")
    int rebaixarTodosAdmins(@Param("admin") Papel admin, @Param("user") Papel user);

    // ------------------------------------------------------------------ painel de admin

    long countByCriadoEmGreaterThanEqual(OffsetDateTime inicio);

    long countByUltimoAcessoGreaterThanEqual(OffsetDateTime inicio);

    @Query("select u.criadoEm from Usuario u where u.criadoEm >= :inicio")
    List<OffsetDateTime> datasDeCadastroDesde(@Param("inicio") OffsetDateTime inicio);

    /**
     * Usuários com a quantidade de transações e metas de cada um, mais novos primeiro.
     * {@code padrao} já vem em minúsculas e com % (ex.: "%maria%"); "%" sozinho = todos.
     */
    @Query(value = """
            select new com.nexum.api.admin.dto.AdminUsuarioResponse(
                u.id, u.nome, u.email, u.papel, u.criadoEm, u.ultimoAcesso,
                (select count(t) from Transacao t where t.usuarioId = u.id),
                (select count(m) from Meta m where m.usuarioId = u.id))
            from Usuario u
            where lower(u.nome) like :padrao escape '!' or u.email like :padrao escape '!'
            order by u.criadoEm desc, u.id desc
            """,
            countQuery = """
            select count(u) from Usuario u
            where lower(u.nome) like :padrao escape '!' or u.email like :padrao escape '!'
            """)
    Page<AdminUsuarioResponse> listarParaAdmin(@Param("padrao") String padrao, Pageable pagina);
}
