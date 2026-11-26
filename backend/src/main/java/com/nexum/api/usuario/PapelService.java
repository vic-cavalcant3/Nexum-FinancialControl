package com.nexum.api.usuario;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Define quem é ADMIN a partir da variável ADMIN_EMAILS (lista separada por vírgula).
 * <ul>
 *   <li>Ao iniciar a API: todo mundo da lista vira ADMIN e os ADMIN fora dela voltam a USER.</li>
 *   <li>No cadastro, no login e ao trocar o e-mail: o papel do usuário é recalculado.</li>
 * </ul>
 * Assim, tirar um e-mail da lista e reiniciar a API já remove o acesso de admin.
 */
@Service
public class PapelService {

    private static final Logger log = LoggerFactory.getLogger(PapelService.class);

    private final Set<String> emailsAdmin;
    private final UsuarioRepository usuarioRepository;

    public PapelService(@Value("${app.admin-emails:}") String listaAdmin, UsuarioRepository usuarioRepository) {
        this.emailsAdmin = Arrays.stream(listaAdmin.split(","))
                .map(e -> e.trim().toLowerCase(Locale.ROOT))
                .filter(e -> !e.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
        this.usuarioRepository = usuarioRepository;
    }

    /** Papel que o e-mail deve ter (o e-mail já vem em minúsculas). */
    public Papel papelPara(String email) {
        return email != null && emailsAdmin.contains(email.toLowerCase(Locale.ROOT)) ? Papel.ADMIN : Papel.USER;
    }

    /** Ajusta o papel da entidade (salvo junto com a transação de quem chamou). */
    public void aplicar(Usuario usuario) {
        Papel papel = papelPara(usuario.getEmail());
        if (usuario.getPapel() != papel) {
            usuario.setPapel(papel);
        }
    }

    /** Sincroniza o banco inteiro com a lista, uma vez, quando a API termina de subir. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void sincronizarTodos() {
        int promovidos = 0;
        int rebaixados;
        if (emailsAdmin.isEmpty()) {
            rebaixados = usuarioRepository.rebaixarTodosAdmins(Papel.ADMIN, Papel.USER);
        } else {
            promovidos = usuarioRepository.definirPapel(emailsAdmin, Papel.ADMIN);
            rebaixados = usuarioRepository.rebaixarAdminsFora(emailsAdmin, Papel.ADMIN, Papel.USER);
        }
        log.info("Papéis sincronizados com ADMIN_EMAILS ({} e-mail(s)): {} promovido(s) a ADMIN, {} rebaixado(s) a USER.",
                emailsAdmin.size(), promovidos, rebaixados);
    }
}
