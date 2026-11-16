package com.nexum.api.orcamento;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexum.api.categoria.Categoria;
import com.nexum.api.categoria.CategoriaRepository;
import com.nexum.api.categoria.CategoriaService;
import com.nexum.api.common.Dinheiro;
import com.nexum.api.common.Periodo;
import com.nexum.api.common.RequisicaoInvalidaException;
import com.nexum.api.common.TipoTransacao;
import com.nexum.api.orcamento.dto.OrcamentoRequest;
import com.nexum.api.orcamento.dto.OrcamentoResponse;
import com.nexum.api.transacao.TransacaoRepository;

/** Orçamento mensal por categoria (tela de Planejamento). */
@Service
public class OrcamentoService {

    private final OrcamentoRepository orcamentoRepository;
    private final CategoriaRepository categoriaRepository;
    private final CategoriaService categoriaService;
    private final TransacaoRepository transacaoRepository;
    private final ZoneId fuso;
    private final Clock clock;

    public OrcamentoService(OrcamentoRepository orcamentoRepository, CategoriaRepository categoriaRepository,
                            CategoriaService categoriaService, TransacaoRepository transacaoRepository,
                            ZoneId fusoHorario, Clock clock) {
        this.orcamentoRepository = orcamentoRepository;
        this.categoriaRepository = categoriaRepository;
        this.categoriaService = categoriaService;
        this.transacaoRepository = transacaoRepository;
        this.fuso = fusoHorario;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public OrcamentoResponse consultar(Long usuarioId, Integer mes, Integer ano) {
        YearMonth referencia = Periodo.mesAno(mes, ano, clock);
        if (referencia == null) {
            throw new RequisicaoInvalidaException("Informe o mês junto com o ano.");
        }
        return montar(usuarioId, referencia);
    }

    /** Substitui o orçamento do mês pela lista enviada. */
    @Transactional
    public OrcamentoResponse definir(Long usuarioId, OrcamentoRequest dados) {
        YearMonth referencia = YearMonth.of(Periodo.validarAno(dados.ano()), Periodo.validarMes(dados.mes()));
        LocalDate mesReferencia = referencia.atDay(1);

        List<Orcamento> novos = new ArrayList<>();
        Set<Long> vistos = new HashSet<>();
        for (OrcamentoRequest.Limite item : dados.limites()) {
            if (!vistos.add(item.categoriaId())) {
                throw new RequisicaoInvalidaException("A mesma categoria apareceu duas vezes no orçamento.");
            }
            Categoria categoria = categoriaService.buscarVisivel(usuarioId, item.categoriaId()); // 404 se não for dele
            if (categoria.getTipo() != TipoTransacao.DESPESA) {
                throw new RequisicaoInvalidaException("O orçamento só aceita categorias de despesa ("
                        + categoria.getNome() + " é de receita).");
            }
            novos.add(new Orcamento(usuarioId, categoria, mesReferencia, Dinheiro.de(item.limite())));
        }

        // Apaga o mês e grava de novo: simples e sem sobrar limite de categoria removida.
        orcamentoRepository.apagarDoMes(usuarioId, mesReferencia);
        orcamentoRepository.saveAll(novos);
        orcamentoRepository.flush();

        return montar(usuarioId, referencia);
    }

    private OrcamentoResponse montar(Long usuarioId, YearMonth referencia) {
        // 1. Limites do mês (ou herdados do último mês planejado)
        List<Orcamento> linhas = orcamentoRepository.findByUsuarioIdAndMesReferencia(usuarioId, referencia.atDay(1));
        boolean herdado = false;
        if (linhas.isEmpty()) {
            LocalDate anterior = orcamentoRepository.ultimoMesAntes(usuarioId, referencia.atDay(1));
            if (anterior != null) {
                linhas = orcamentoRepository.findByUsuarioIdAndMesReferencia(usuarioId, anterior);
                herdado = true;
            }
        }
        Map<Long, BigDecimal> limites = new HashMap<>();
        linhas.forEach(o -> limites.put(o.getCategoria().getId(), o.getLimite()));

        // 2. Gasto do mês por categoria (chave null = despesas sem categoria)
        Periodo periodo = Periodo.doMes(referencia, fuso);
        Map<Long, BigDecimal> gastos = new HashMap<>();
        BigDecimal totalGasto = Dinheiro.ZERO;
        for (TransacaoRepository.TotalPorCategoria t : transacaoRepository.somarPorCategoria(
                usuarioId, TipoTransacao.DESPESA, periodo.inicio(), periodo.fim())) {
            BigDecimal valor = Dinheiro.ouZero(t.getTotal());
            gastos.put(t.getCategoriaId(), valor);
            totalGasto = totalGasto.add(valor);
        }

        // 3. Uma linha por categoria de despesa do usuário
        BigDecimal totalOrcado = Dinheiro.ZERO;
        List<OrcamentoResponse.Item> itens = new ArrayList<>();
        for (Categoria c : categoriaRepository.listarVisiveisPorTipo(usuarioId, TipoTransacao.DESPESA)) {
            BigDecimal limite = limites.get(c.getId());
            BigDecimal gasto = gastos.getOrDefault(c.getId(), Dinheiro.ZERO);
            if (limite != null) {
                totalOrcado = totalOrcado.add(limite);
            }
            itens.add(new OrcamentoResponse.Item(c.getId(), c.getNome(), c.getIcone(), limite, gasto,
                    percentual(gasto, limite)));
        }

        // Com limite primeiro (maior limite antes), depois as sem limite, por nome.
        itens.sort(Comparator
                .comparing((OrcamentoResponse.Item i) -> i.limite() == null)
                .thenComparing(i -> i.limite() == null ? BigDecimal.ZERO : i.limite(), Comparator.reverseOrder())
                .thenComparing(OrcamentoResponse.Item::nome));

        return new OrcamentoResponse(referencia.getMonthValue(), referencia.getYear(), herdado,
                totalOrcado, totalGasto, itens);
    }

    /** gasto / limite * 100, inteiro. Sem limite (ou limite zero): null. Pode passar de 100. */
    private static Integer percentual(BigDecimal gasto, BigDecimal limite) {
        if (limite == null || limite.signum() == 0) {
            return null;
        }
        return gasto.multiply(BigDecimal.valueOf(100)).divide(limite, 0, RoundingMode.HALF_UP).intValue();
    }
}
