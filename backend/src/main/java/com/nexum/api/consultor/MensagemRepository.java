package com.nexum.api.consultor;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MensagemRepository extends JpaRepository<Mensagem, Long> {

    /** Todas as mensagens da conversa, em ordem. */
    List<Mensagem> findByConversaIdOrderByIdAsc(Long conversaId);

    /** As N últimas mensagens da conversa (mais recente primeiro): histórico enviado ao Claude. */
    List<Mensagem> findByConversaIdOrderByIdDesc(Long conversaId, Pageable limite);

    /** Perguntas (USER) do usuário desde um instante (00:00 de hoje no fuso da aplicação). */
    @Query("""
            select count(m) from Mensagem m, Conversa c
            where m.conversaId = c.id and c.usuarioId = :usuarioId
              and m.papel = com.nexum.api.consultor.PapelMensagem.USER and m.criadoEm >= :desde
            """)
    long contarPerguntasDesde(@Param("usuarioId") Long usuarioId, @Param("desde") OffsetDateTime desde);
}
