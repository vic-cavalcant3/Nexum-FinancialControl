package com.nexum.api.admin;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexum.api.admin.dto.AdminUsuarioResponse;
import com.nexum.api.admin.dto.CadastrosMesResponse;
import com.nexum.api.admin.dto.EstatisticasResponse;
import com.nexum.api.admin.dto.PaginaUsuariosResponse;
import com.nexum.api.common.ApiException;
import com.nexum.api.common.RecursoNaoEncontradoException;
import com.nexum.api.common.RequisicaoInvalidaException;
import com.nexum.api.meta.MetaRepository;
import com.nexum.api.security.UsuarioAutenticado;
import com.nexum.api.transacao.TransacaoRepository;
import com.nexum.api.usuario.Papel;
import com.nexum.api.usuario.Usuario;
import com.nexum.api.usuario.UsuarioRepository;

/**
 * Regras do painel de admin. Quem chega aqui já é ADMIN (SecurityConfig barra o resto com 403).
 */
@Service
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);

    static final int TAMANHO_PADRAO = 20;
    static final int TAMANHO_MAXIMO = 100;
    static final int MESES_GRAFICO = 12;

    private final UsuarioRepository usuarioRepository;
    private final TransacaoRepository transacaoRepository;
    private final MetaRepository metaRepository;
    private final Clock clock;
    private final ZoneId fuso;

    public AdminService(UsuarioRepository usuarioRepository, TransacaoRepository transacaoRepository,
                        MetaRepository metaRepository, Clock clock, ZoneId fusoHorario) {
        this.usuarioRepository = usuarioRepository;
        this.transacaoRepository = transacaoRepository;
        this.metaRepository = metaRepository;
        this.clock = clock;
        this.fuso = fusoHorario;
    }

    @Transactional(readOnly = true)
    public EstatisticasResponse estatisticas() {
        OffsetDateTime agora = OffsetDateTime.now(clock).withOffsetSameInstant(ZoneOffset.UTC);
        return new EstatisticasResponse(
                usuarioRepository.count(),
                usuarioRepository.countByCriadoEmGreaterThanEqual(agora.minusDays(30)),
                usuarioRepository.countByUltimoAcessoGreaterThanEqual(agora.minusDays(7)),
                transacaoRepository.count(),
                metaRepository.count(),
                cadastrosPorMes());
    }

    /** Últimos 12 meses (no fuso dos usuários), do mais antigo ao atual, com 0 nos meses vazios. */
    private List<CadastrosMesResponse> cadastrosPorMes() {
        YearMonth atual = YearMonth.now(clock);
        YearMonth primeiro = atual.minusMonths(MESES_GRAFICO - 1L);

        Map<YearMonth, Long> porMes = new LinkedHashMap<>();
        for (YearMonth m = primeiro; !m.isAfter(atual); m = m.plusMonths(1)) {
            porMes.put(m, 0L);
        }

        OffsetDateTime inicio = primeiro.atDay(1).atStartOfDay(fuso).toOffsetDateTime();
        for (OffsetDateTime criadoEm : usuarioRepository.datasDeCadastroDesde(inicio)) {
            YearMonth mes = YearMonth.from(criadoEm.atZoneSameInstant(fuso));
            porMes.computeIfPresent(mes, (k, v) -> v + 1);
        }

        List<CadastrosMesResponse> lista = new ArrayList<>(porMes.size());
        porMes.forEach((m, total) -> lista.add(new CadastrosMesResponse(m.getYear(), m.getMonthValue(), total)));
        return lista;
    }

    @Transactional(readOnly = true)
    public PaginaUsuariosResponse listarUsuarios(String busca, Integer pagina, Integer tamanho) {
        int p = pagina == null ? 0 : pagina;
        int t = tamanho == null ? TAMANHO_PADRAO : tamanho;
        if (p < 0) {
            throw new RequisicaoInvalidaException("A página começa em 0.");
        }
        if (t < 1 || t > TAMANHO_MAXIMO) {
            throw new RequisicaoInvalidaException("O tamanho da página deve ser de 1 a " + TAMANHO_MAXIMO + ".");
        }

        Page<AdminUsuarioResponse> resultado =
                usuarioRepository.listarParaAdmin(padraoBusca(busca), PageRequest.of(p, t));
        return new PaginaUsuariosResponse(resultado.getContent(), p, t,
                resultado.getTotalElements(), resultado.getTotalPages());
    }

    /** "Ma_ria%" → "%ma!_ria!%%": % e _ digitados são procurados como texto (escape "!"), não como curinga. */
    static String padraoBusca(String busca) {
        if (busca == null || busca.isBlank()) {
            return "%";
        }
        String texto = busca.trim().toLowerCase(Locale.ROOT)
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");
        return "%" + texto + "%";
    }

    /**
     * Apaga o usuário e tudo dele (transações, metas, categorias próprias, orçamentos) numa transação.
     * Os dados dependentes saem pelo ON DELETE CASCADE das chaves estrangeiras (migration V1).
     */
    @Transactional
    public void excluirUsuario(UsuarioAutenticado admin, Long id) {
        if (id.equals(admin.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Você não pode excluir a sua própria conta.");
        }
        Usuario alvo = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (alvo.getPapel() == Papel.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Não é possível excluir outro administrador.");
        }

        usuarioRepository.delete(alvo);
        usuarioRepository.flush();
        log.info("Admin {} (id {}) excluiu o usuário {} (id {}) e todos os dados dele.",
                admin.email(), admin.id(), alvo.getEmail(), alvo.getId());
    }
}
