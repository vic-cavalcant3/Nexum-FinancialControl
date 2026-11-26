package com.nexum.api.admin;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.nexum.api.admin.dto.EstatisticasResponse;
import com.nexum.api.admin.dto.PaginaUsuariosResponse;
import com.nexum.api.common.MensagemResponse;
import com.nexum.api.security.UsuarioAutenticado;

/**
 * Painel de admin. Todas as rotas exigem papel ADMIN (regra em SecurityConfig):
 * sem token → 401; USER → 403 "Acesso restrito a administradores.".
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/estatisticas")
    public EstatisticasResponse estatisticas() {
        return adminService.estatisticas();
    }

    /** ?busca= (nome ou e-mail) &pagina= (a partir de 0) &tamanho= (padrão 20, máx. 100). */
    @GetMapping("/usuarios")
    public PaginaUsuariosResponse usuarios(@RequestParam(required = false) String busca,
                                           @RequestParam(required = false) Integer pagina,
                                           @RequestParam(required = false) Integer tamanho) {
        return adminService.listarUsuarios(busca, pagina, tamanho);
    }

    /** 200 { mensagem } · 403 si mesmo ou outro admin · 404 inexistente. */
    @DeleteMapping("/usuarios/{id}")
    public MensagemResponse excluir(@AuthenticationPrincipal UsuarioAutenticado admin, @PathVariable Long id) {
        adminService.excluirUsuario(admin, id);
        return new MensagemResponse("Usuário excluído.");
    }
}
