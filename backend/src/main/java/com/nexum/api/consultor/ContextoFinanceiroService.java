package com.nexum.api.consultor;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexum.api.meta.MetaService;
import com.nexum.api.meta.dto.MetaResponse;
import com.nexum.api.orcamento.OrcamentoService;
import com.nexum.api.orcamento.dto.OrcamentoResponse;
import com.nexum.api.transacao.TransacaoService;
import com.nexum.api.transacao.dto.ResumoResponse;
import com.nexum.api.transacao.dto.TransacaoResponse;

/**
 * Monta, na hora da pergunta, o bloco de DADOS que vai para o Claude: resumo do mês atual e do
 * anterior, gastos por categoria, orçamento x gasto, metas e as 30 últimas transações.
 * <p>
 * Privacidade: NÃO entra nome, e-mail nem nenhum id (do usuário, de transação, de categoria...).
 * Só valores, datas, nomes de categoria e as descrições que o próprio usuário escreveu.
 */
@Service
public class ContextoFinanceiroService {

    static final int ULTIMAS_TRANSACOES = 30;

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");
    private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("dd/MM/yyyy", PT_BR);
    private static final DateTimeFormatter MES = DateTimeFormatter.ofPattern("MMMM/yyyy", PT_BR);

    private final TransacaoService transacaoService;
    private final OrcamentoService orcamentoService;
    private final MetaService metaService;
    private final Clock clock;
    private final ZoneId fuso;

    public ContextoFinanceiroService(TransacaoService transacaoService, OrcamentoService orcamentoService,
                                     MetaService metaService, Clock clock, ZoneId fuso) {
        this.transacaoService = transacaoService;
        this.orcamentoService = orcamentoService;
        this.metaService = metaService;
        this.clock = clock;
        this.fuso = fuso;
    }

    @Transactional(readOnly = true)
    public String montar(Long usuarioId) {
        LocalDate hoje = LocalDate.now(clock);
        YearMonth atual = YearMonth.from(hoje);
        YearMonth anterior = atual.minusMonths(1);

        StringBuilder sb = new StringBuilder();
        sb.append("<dados>\n");
        sb.append("DADOS FINANCEIROS DO USUÁRIO (hoje é ").append(DIA.format(hoje)).append("; valores em reais)\n");

        // ---- Resumo
        ResumoResponse resumoAtual = transacaoService.resumo(usuarioId, atual.getMonthValue(), atual.getYear());
        ResumoResponse resumoAnterior = transacaoService.resumo(usuarioId, anterior.getMonthValue(), anterior.getYear());
        sb.append("\nRESUMO DO MÊS\n");
        linhaResumo(sb, nomeMes(atual) + " (mês atual, até hoje)", resumoAtual);
        linhaResumo(sb, nomeMes(anterior) + " (mês anterior)", resumoAnterior);
        sb.append("- Saldo acumulado (todas as receitas menos todas as despesas até hoje): ")
                .append(moeda(resumoAtual.saldo())).append('\n');

        // ---- Gastos por categoria e orçamento (inclui as categorias criadas pelo usuário)
        OrcamentoResponse orcamento = orcamentoService.consultar(usuarioId, atual.getMonthValue(), atual.getYear());
        List<OrcamentoResponse.Item> comGasto = orcamento.categorias().stream()
                .filter(c -> c.gasto() != null && c.gasto().signum() > 0)
                .sorted(Comparator.comparing(OrcamentoResponse.Item::gasto).reversed())
                .toList();
        sb.append("\nGASTOS POR CATEGORIA EM ").append(nomeMes(atual).toUpperCase(PT_BR)).append('\n');
        BigDecimal somaCategorias = BigDecimal.ZERO;
        for (OrcamentoResponse.Item c : comGasto) {
            sb.append("- ").append(c.nome()).append(": ").append(moeda(c.gasto())).append('\n');
            somaCategorias = somaCategorias.add(c.gasto());
        }
        BigDecimal semCategoria = orcamento.totalGasto().subtract(somaCategorias);
        if (semCategoria.signum() > 0) {
            sb.append("- Sem categoria: ").append(moeda(semCategoria)).append('\n');
        }
        if (comGasto.isEmpty() && semCategoria.signum() <= 0) {
            sb.append("- Nenhuma despesa registrada neste mês.\n");
        }

        List<OrcamentoResponse.Item> comLimite = orcamento.categorias().stream().filter(c -> c.limite() != null).toList();
        sb.append("\nORÇAMENTO X GASTO EM ").append(nomeMes(atual).toUpperCase(PT_BR)).append('\n');
        if (comLimite.isEmpty()) {
            sb.append("- O usuário ainda não definiu limites de orçamento.\n");
        } else {
            for (OrcamentoResponse.Item c : comLimite) {
                sb.append("- ").append(c.nome()).append(": limite ").append(moeda(c.limite()))
                        .append(", gasto ").append(moeda(c.gasto()));
                if (c.percentual() != null) {
                    sb.append(" (").append(c.percentual()).append("% do limite");
                    sb.append(c.percentual() > 100 ? ", ESTOUROU)" : ")");
                }
                sb.append('\n');
            }
            sb.append("- Total orçado: ").append(moeda(orcamento.totalOrcado()))
                    .append("; total gasto no mês: ").append(moeda(orcamento.totalGasto())).append('\n');
        }

        // ---- Metas
        List<MetaResponse> metas = metaService.listar(usuarioId);
        sb.append("\nMETAS\n");
        if (metas.isEmpty()) {
            sb.append("- Nenhuma meta cadastrada.\n");
        }
        for (MetaResponse m : metas) {
            sb.append("- ").append(m.descricao())
                    .append(": objetivo ").append(moeda(m.valorAlvo()))
                    .append(", guardado ").append(moeda(m.valorAtual()))
                    .append(" (").append(m.percentual()).append("%)")
                    .append(", prazo ").append(m.dataPrazo() == null ? "sem prazo" : DIA.format(m.dataPrazo()));
            if (m.aporteMensal() != null && m.aporteMensal().signum() > 0) {
                sb.append(", aporte mensal planejado ").append(moeda(m.aporteMensal()));
            }
            sb.append(", situação: ").append(situacao(m.statusMeta())).append('\n');
        }

        // ---- Últimas transações
        List<TransacaoResponse> ultimas = transacaoService.listar(usuarioId,
                new TransacaoService.ParametrosListagem(null, null, null, null, null, null, null, 1, ULTIMAS_TRANSACOES))
                .itens();
        sb.append("\nÚLTIMAS ").append(ULTIMAS_TRANSACOES).append(" TRANSAÇÕES (mais recentes primeiro)\n");
        if (ultimas.isEmpty()) {
            sb.append("- Nenhuma transação registrada.\n");
        }
        for (TransacaoResponse t : ultimas) {
            sb.append("- ").append(DIA.format(t.data().atZoneSameInstant(fuso)))
                    .append(" | ").append(t.descricao() == null || t.descricao().isBlank() ? "(sem descrição)" : umaLinha(t.descricao()))
                    .append(" | ").append(t.categoria() == null ? "Sem categoria" : t.categoria().nome())
                    .append(" | ").append(t.tipo())
                    .append(" | ").append(moeda(t.valor())).append('\n');
        }
        sb.append("</dados>");
        return sb.toString();
    }

    private static void linhaResumo(StringBuilder sb, String rotulo, ResumoResponse r) {
        sb.append("- ").append(rotulo).append(": receitas ").append(moeda(r.receitas()))
                .append("; despesas ").append(moeda(r.despesas()))
                .append("; economia (receitas - despesas) ").append(moeda(r.economias()));
        if (r.receitas().signum() > 0) {
            int taxa = r.economias().multiply(BigDecimal.valueOf(100))
                    .divide(r.receitas(), 0, java.math.RoundingMode.HALF_UP).intValue();
            sb.append(" = ").append(taxa).append("% das receitas");
        }
        sb.append('\n');
    }

    private static String situacao(String status) {
        if (status == null) {
            return "em andamento";
        }
        return switch (status) {
            case "concluida" -> "concluída";
            case "cancelada" -> "cancelada";
            default -> "em andamento";
        };
    }

    private static String nomeMes(YearMonth mes) {
        String s = MES.format(mes);
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    /** Descrição numa linha só (não deixa o texto do usuário bagunçar a lista). */
    private static String umaLinha(String s) {
        return s.strip().replaceAll("\\s+", " ");
    }

    static String moeda(BigDecimal valor) {
        NumberFormat f = NumberFormat.getCurrencyInstance(PT_BR);
        return f.format(valor == null ? BigDecimal.ZERO : valor).replace(' ', ' ');
    }
}
