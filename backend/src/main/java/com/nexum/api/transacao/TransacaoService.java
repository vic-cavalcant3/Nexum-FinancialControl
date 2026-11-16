package com.nexum.api.transacao;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexum.api.categoria.Categoria;
import com.nexum.api.categoria.CategoriaService;
import com.nexum.api.common.Dinheiro;
import com.nexum.api.common.Periodo;
import com.nexum.api.common.RecursoNaoEncontradoException;
import com.nexum.api.common.RequisicaoInvalidaException;
import com.nexum.api.common.TipoTransacao;
import com.nexum.api.transacao.TransacaoRepository.TotalPorTipo;
import com.nexum.api.transacao.dto.RelatorioResponse;
import com.nexum.api.transacao.dto.ResumoResponse;
import com.nexum.api.transacao.dto.TransacaoRequest;
import com.nexum.api.transacao.dto.TransacaoResponse;

/** Regras das transações: CRUD, filtros, resumo do mês e relatório. */
@Service
public class TransacaoService {

    static final String NAO_ENCONTRADA = "Transação não encontrada.";
    static final int TAMANHO_PADRAO = 50;
    static final int TAMANHO_MAXIMO = 500;
    static final int MESES_PADRAO = 6;
    static final int MESES_MAXIMO = 24;

    /** Mais recentes primeiro; empate na data, a criada por último primeiro. */
    private static final Sort ORDEM = Sort.by(Sort.Order.desc("data"), Sort.Order.desc("id"));

    private final TransacaoRepository transacaoRepository;
    private final CategoriaService categoriaService;
    private final ZoneId fuso;
    private final Clock clock;

    public TransacaoService(TransacaoRepository transacaoRepository, CategoriaService categoriaService,
                            ZoneId fusoHorario, Clock clock) {
        this.transacaoRepository = transacaoRepository;
        this.categoriaService = categoriaService;
        this.fuso = fusoHorario;
        this.clock = clock;
    }

    /** Parâmetros da URL de GET /api/transacoes, como chegam (tudo opcional). */
    public record ParametrosListagem(Integer mes, Integer ano, String tipo, Long categoriaId, String categoria,
                                     String conta, String busca, Integer pagina, Integer tamanho) {
    }

    /** Uma página da listagem + total de itens (vai no header X-Total-Count). */
    public record Listagem(List<TransacaoResponse> itens, long total) {
    }

    // ------------------------------------------------------------------ listar

    @Transactional(readOnly = true)
    public Listagem listar(Long usuarioId, ParametrosListagem p) {
        TransacaoFiltros filtros = montarFiltros(usuarioId, p);

        if (p.pagina() == null && p.tamanho() == null) {
            // Sem paginação: devolve tudo (é o que o front faz hoje: Transacoes.listar()).
            List<TransacaoResponse> itens = transacaoRepository.findAll(filtros.paraSpecification(), ORDEM)
                    .stream().map(TransacaoResponse::de).toList();
            return new Listagem(itens, itens.size());
        }

        int pagina = p.pagina() == null ? 1 : p.pagina();
        int tamanho = p.tamanho() == null ? TAMANHO_PADRAO : p.tamanho();
        if (pagina < 1) {
            throw new RequisicaoInvalidaException("A página começa em 1.");
        }
        if (tamanho < 1 || tamanho > TAMANHO_MAXIMO) {
            throw new RequisicaoInvalidaException("O tamanho da página deve ser de 1 a " + TAMANHO_MAXIMO + ".");
        }
        // O Spring conta páginas a partir de 0; a API, a partir de 1.
        Page<Transacao> resultado = transacaoRepository.findAll(filtros.paraSpecification(),
                PageRequest.of(pagina - 1, tamanho, ORDEM));
        return new Listagem(resultado.map(TransacaoResponse::de).getContent(), resultado.getTotalElements());
    }

    private TransacaoFiltros montarFiltros(Long usuarioId, ParametrosListagem p) {
        Periodo periodo = null;
        if (p.mes() != null) {
            periodo = Periodo.doMes(Periodo.mesAno(p.mes(), p.ano(), clock), fuso);
        } else if (p.ano() != null) {
            int ano = Periodo.validarAno(p.ano());
            periodo = Periodo.deMeses(YearMonth.of(ano, 1), YearMonth.of(ano, 12), fuso);
        }

        Long categoriaId = p.categoriaId();
        String categoriaNome = null;
        String categoria = semBrancos(p.categoria());
        if (categoria != null) {
            // ?categoria= aceita o id (?categoria=3) ou o nome (?categoria=Lazer)
            if (categoria.matches("\\d+")) {
                categoriaId = Long.valueOf(categoria);
            } else {
                categoriaNome = categoria;
            }
        }

        return new TransacaoFiltros(
                usuarioId,
                periodo == null ? null : periodo.inicio(),
                periodo == null ? null : periodo.fim(),
                semBrancos(p.tipo()) == null ? null : TipoTransacao.de(p.tipo()),
                categoriaId,
                categoriaNome,
                semBrancos(p.conta()),
                semBrancos(p.busca()));
    }

    // ------------------------------------------------------------------ CRUD

    @Transactional(readOnly = true)
    public TransacaoResponse buscar(Long usuarioId, Long id) {
        return TransacaoResponse.de(buscarDoUsuario(usuarioId, id));
    }

    @Transactional
    public TransacaoResponse criar(Long usuarioId, TransacaoRequest dados) {
        Transacao transacao = new Transacao(usuarioId);
        preencher(transacao, usuarioId, dados);
        transacaoRepository.save(transacao);
        return TransacaoResponse.de(transacao);
    }

    /** PUT substitui os campos; só a conta é mantida quando não vem no corpo. */
    @Transactional
    public TransacaoResponse atualizar(Long usuarioId, Long id, TransacaoRequest dados) {
        Transacao transacao = buscarDoUsuario(usuarioId, id);
        preencher(transacao, usuarioId, dados);
        transacaoRepository.flush();
        return TransacaoResponse.de(transacao);
    }

    @Transactional
    public void excluir(Long usuarioId, Long id) {
        transacaoRepository.delete(buscarDoUsuario(usuarioId, id));
    }

    /** Transação do usuário. Se for de outro usuário, 404 (como se não existisse). */
    private Transacao buscarDoUsuario(Long usuarioId, Long id) {
        return transacaoRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));
    }

    private void preencher(Transacao transacao, Long usuarioId, TransacaoRequest dados) {
        TipoTransacao tipo = TipoTransacao.de(dados.tipo());

        Categoria categoria = null;
        if (dados.categoriaId() != null) {
            categoria = categoriaService.buscarVisivel(usuarioId, dados.categoriaId());
            if (categoria.getTipo() != tipo) {
                throw new RequisicaoInvalidaException("A categoria " + categoria.getNome() + " é de "
                        + categoria.getTipo().valor() + ": escolha uma categoria de " + tipo.valor() + ".");
            }
        }

        transacao.setTipo(tipo);
        transacao.setCategoria(categoria);
        transacao.setDescricao(semBrancos(dados.descricao()));
        transacao.setValor(Dinheiro.de(dados.valor()));
        transacao.setData(lerData(dados.data()));
        if (dados.conta() != null) {
            transacao.setConta(semBrancos(dados.conta()));
        }
    }

    /**
     * Aceita "2026-11-16" (vira meio-dia no fuso do usuário, para o dia não mudar),
     * "2026-11-16T13:15:00.000Z" / com offset, ou "2026-11-16T10:15" (hora local do usuário).
     */
    private OffsetDateTime lerData(String texto) {
        String s = texto.trim();
        try {
            if (s.length() == 10) {
                return LocalDate.parse(s).atTime(12, 0).atZone(fuso).toOffsetDateTime();
            }
            try {
                return OffsetDateTime.parse(s);
            } catch (DateTimeParseException semFuso) {
                return LocalDateTime.parse(s).atZone(fuso).toOffsetDateTime();
            }
        } catch (DateTimeParseException e) {
            throw new RequisicaoInvalidaException("Data inválida: use o formato AAAA-MM-DD.");
        }
    }

    // ------------------------------------------------------------------ resumo

    @Transactional(readOnly = true)
    public ResumoResponse resumo(Long usuarioId, Integer mes, Integer ano) {
        YearMonth referencia = Periodo.mesAno(mes, ano, clock);
        if (referencia == null) {
            throw new RequisicaoInvalidaException("Informe o mês junto com o ano.");
        }
        Periodo periodo = Periodo.doMes(referencia, fuso);

        Map<TipoTransacao, BigDecimal> doMes = porTipo(transacaoRepository.somarPorTipo(usuarioId, periodo.inicio(), periodo.fim()));
        Map<TipoTransacao, BigDecimal> ateFim = porTipo(transacaoRepository.somarPorTipoAte(usuarioId, periodo.fim()));

        BigDecimal receitas = doMes.get(TipoTransacao.RECEITA);
        BigDecimal despesas = doMes.get(TipoTransacao.DESPESA);
        BigDecimal saldo = ateFim.get(TipoTransacao.RECEITA).subtract(ateFim.get(TipoTransacao.DESPESA));
        return new ResumoResponse(referencia.getMonthValue(), referencia.getYear(),
                receitas, despesas, receitas.subtract(despesas), saldo);
    }

    private static Map<TipoTransacao, BigDecimal> porTipo(List<TotalPorTipo> totais) {
        Map<TipoTransacao, BigDecimal> mapa = new LinkedHashMap<>();
        for (TipoTransacao tipo : TipoTransacao.values()) {
            mapa.put(tipo, Dinheiro.ZERO);
        }
        totais.forEach(t -> mapa.put(t.getTipo(), Dinheiro.ouZero(t.getTotal())));
        return mapa;
    }

    // ------------------------------------------------------------------ relatório

    @Transactional(readOnly = true)
    public RelatorioResponse relatorio(Long usuarioId, Integer meses, Integer mes, Integer ano) {
        int n = meses == null ? MESES_PADRAO : meses;
        if (n < 1 || n > MESES_MAXIMO) {
            throw new RequisicaoInvalidaException("O período deve ser de 1 a " + MESES_MAXIMO + " meses.");
        }
        YearMonth ultimo = Periodo.mesAno(mes, ano, clock);
        if (ultimo == null) {
            throw new RequisicaoInvalidaException("Informe o mês junto com o ano.");
        }
        YearMonth primeiro = ultimo.minusMonths(n - 1L);
        Periodo periodo = Periodo.deMeses(primeiro, ultimo, fuso);

        // Um "balde" por mês, já em ordem, para meses sem movimento aparecerem zerados.
        Map<YearMonth, BigDecimal[]> porMes = new LinkedHashMap<>();
        for (YearMonth m = primeiro; !m.isAfter(ultimo); m = m.plusMonths(1)) {
            porMes.put(m, new BigDecimal[] {Dinheiro.ZERO, Dinheiro.ZERO}); // [receitas, despesas]
        }
        Map<Long, AcumuladoCategoria> porCategoria = new LinkedHashMap<>();
        BigDecimal totalReceitas = Dinheiro.ZERO;
        BigDecimal totalDespesas = Dinheiro.ZERO;

        for (Transacao t : transacaoRepository.listarNoPeriodo(usuarioId, periodo.inicio(), periodo.fim())) {
            BigDecimal[] balde = porMes.get(YearMonth.from(t.getData().atZoneSameInstant(fuso)));
            if (t.getTipo() == TipoTransacao.RECEITA) {
                balde[0] = balde[0].add(t.getValor());
                totalReceitas = totalReceitas.add(t.getValor());
            } else {
                balde[1] = balde[1].add(t.getValor());
                totalDespesas = totalDespesas.add(t.getValor());
                Categoria c = t.getCategoria();
                porCategoria.computeIfAbsent(c == null ? null : c.getId(), id -> new AcumuladoCategoria(c))
                        .somar(t.getValor());
            }
        }

        List<RelatorioResponse.Mes> listaMeses = new ArrayList<>();
        porMes.forEach((m, v) -> listaMeses.add(
                new RelatorioResponse.Mes(m.getMonthValue(), m.getYear(), v[0], v[1], v[0].subtract(v[1]))));

        BigDecimal despesasDoPeriodo = totalDespesas;
        List<RelatorioResponse.Categoria> listaCategorias = porCategoria.values().stream()
                .sorted(Comparator.comparing((AcumuladoCategoria a) -> a.total).reversed())
                .map(a -> new RelatorioResponse.Categoria(
                        a.categoria == null ? null : a.categoria.getId(),
                        a.categoria == null ? "Sem categoria" : a.categoria.getNome(),
                        a.categoria == null ? null : a.categoria.getIcone(),
                        a.total,
                        Dinheiro.percentual(a.total, despesasDoPeriodo)))
                .toList();

        return new RelatorioResponse(n, totalReceitas, totalDespesas, totalReceitas.subtract(totalDespesas),
                listaMeses, listaCategorias);
    }

    private static final class AcumuladoCategoria {
        private final Categoria categoria;
        private BigDecimal total = Dinheiro.ZERO;

        AcumuladoCategoria(Categoria categoria) {
            this.categoria = categoria;
        }

        void somar(BigDecimal valor) {
            total = total.add(valor);
        }
    }

    private static String semBrancos(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
