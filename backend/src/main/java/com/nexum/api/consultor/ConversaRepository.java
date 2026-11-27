package com.nexum.api.consultor;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversaRepository extends JpaRepository<Conversa, Long> {

    /** Conversas do usuário, mais recentes primeiro. */
    List<Conversa> findByUsuarioIdOrderByAtualizadoEmDescIdDesc(Long usuarioId);

    /** A conversa só "existe" para o dono (de outro usuário = vazio = 404). */
    Optional<Conversa> findByIdAndUsuarioId(Long id, Long usuarioId);
}
