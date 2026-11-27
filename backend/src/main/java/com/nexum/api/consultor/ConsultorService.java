package com.nexum.api.consultor;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.nexum.api.common.ApiException;
import com.nexum.api.common.RecursoNaoEncontradoException;
import com.nexum.api.common.RequisicaoInvalidaException;
import com.nexum.api.consultor.ClienteIa.MensagemIa;
import com.nexum.api.consultor.ClienteIa.RespostaIa;
import com.nexum.api.consultor.dto.ConversaDetalheResponse;
import com.nexum.api.consultor.dto.ConversaResponse;
import com.nexum.api.consultor.dto.MensagemResponse;
import com.nexum.api.consultor.dto.RespostaConsultorResponse;
import com.nexum.api.consultor.dto.UsoResponse;

/**
 * Regras do Consultor IA: conversas do usuário, limite diário de perguntas e a chamada ao Claude.
 * <p>
 * A chamada à Anthropic (até 60 s) acontece FORA de transação do banco, para não segurar conexão
 * do pool. A pergunta e a resposta são gravadas juntas depois que a resposta chega: se a Anthropic
 * falhar, nada é salvo e a pergunta não conta no limite do dia.
 */
@Service
public class ConsultorService {

    private static final Logger log = LoggerFactory.getLogger(ConsultorService.class);

    static final String INDISPONIVEL = "Consultor IA indisponível no momento.";
    static final String FALHA_IA = "O Consultor IA não conseguiu responder agora. Tente de novo em alguns minutos.";
    static final String NAO_ENCONTRADA = "Conversa não encontrada.";
    static final int MAX_CARACTERES = 1000;
    /** Mensagens anteriores da conversa enviadas junto com a pergunta nova. */
    static final int HISTORICO = 10;

    private final ConversaRepository conversaRepository;
    private final MensagemRepository mensagemRepository;
    private final ContextoFinanceiroService contexto;
    private final ClienteIa clienteIa;
    private final ConsultorProperties props;
    private final TransactionTemplate transacao;
    private final Clock clock;
    private final ZoneId fuso;

    public ConsultorService(ConversaRepository conversaRepository, MensagemRepository mensagemRepository,
                            ContextoFinanceiroService contexto, ClienteIa clienteIa, ConsultorProperties props,
                            PlatformTransactionManager transactionManager, Clock clock, ZoneId fuso) {
        this.conversaRepository = conversaRepository;
        this.mensagemRepository = mensagemRepository;
        this.contexto = contexto;
        this.clienteIa = clienteIa;
        this.props = props;
        this.transacao = new TransactionTemplate(transactionManager);
        this.clock = clock;
        this.fuso = fuso;
    }

    // ------------------------------------------------------------------ conversas

    public List<ConversaResponse> listar(Long usuarioId) {
        garantirDisponivel();
        return conversaRepository.findByUsuarioIdOrderByAtualizadoEmDescIdDesc(usuarioId).stream()
                .map(ConversaResponse::de).toList();
    }

    public ConversaResponse criar(Long usuarioId) {
        garantirDisponivel();
        return ConversaResponse.de(conversaRepository.save(new Conversa(usuarioId)));
    }

    public ConversaDetalheResponse buscar(Long usuarioId, Long conversaId) {
        garantirDisponivel();
        Conversa c = daConversa(usuarioId, conversaId);
        List<MensagemResponse> mensagens = mensagemRepository.findByConversaIdOrderByIdAsc(c.getId()).stream()
                .map(MensagemResponse::de).toList();
        return new ConversaDetalheResponse(c.getId(), c.getTitulo(), c.getAtualizadoEm(), mensagens);
    }

    public void excluir(Long usuarioId, Long conversaId) {
        garantirDisponivel();
        // As mensagens saem junto (ON DELETE CASCADE).
        conversaRepository.delete(daConversa(usuarioId, conversaId));
    }

    public UsoResponse uso(Long usuarioId) {
        garantirDisponivel();
        return new UsoResponse(perguntasHoje(usuarioId), props.limiteDiario());
    }

    // ------------------------------------------------------------------ perguntar

    public RespostaConsultorResponse perguntar(Long usuarioId, Long conversaId, String texto) {
        garantirDisponivel();
        Conversa conversa = daConversa(usuarioId, conversaId);

        String pergunta = texto == null ? "" : texto.strip();
        if (pergunta.isEmpty()) {
            throw new RequisicaoInvalidaException("Escreva sua pergunta.");
        }
        if (pergunta.length() > MAX_CARACTERES) {
            throw new RequisicaoInvalidaException("A pergunta pode ter no máximo " + MAX_CARACTERES + " caracteres.");
        }

        int limite = props.limiteDiario();
        if (perguntasHoje(usuarioId) >= limite) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Você usou suas " + limite + " mensagens de hoje. Volte amanhã!");
        }

        List<MensagemIa> mensagens = historico(conversa.getId());
        mensagens.add(new MensagemIa(PapelMensagem.USER, pergunta));
        String dados = contexto.montar(usuarioId);

        RespostaIa resposta;
        try {
            resposta = clienteIa.responder(InstrucoesConsultor.TEXTO, dados, mensagens);
        } catch (IaIndisponivelException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, FALHA_IA);
        }
        log.info("Consultor IA: conversa {} - tokens de entrada {}, de saída {}.",
                conversa.getId(), resposta.tokensEntrada(), resposta.tokensSaida());

        return transacao.execute(status -> {
            Conversa c = daConversa(usuarioId, conversaId); // pode ter sido apagada enquanto esperava
            Mensagem salvaPergunta = mensagemRepository.save(
                    new Mensagem(c.getId(), PapelMensagem.USER, pergunta, null, null));
            Mensagem salvaResposta = mensagemRepository.save(new Mensagem(c.getId(), PapelMensagem.ASSISTANT,
                    resposta.texto(), resposta.tokensEntrada(), resposta.tokensSaida()));
            c.registrarPergunta(pergunta);
            conversaRepository.saveAndFlush(c);
            return new RespostaConsultorResponse(MensagemResponse.de(salvaPergunta), MensagemResponse.de(salvaResposta),
                    ConversaResponse.de(c), new UsoResponse(perguntasHoje(usuarioId), limite));
        });
    }

    /** Últimas 10 mensagens da conversa, em ordem, começando sempre por uma pergunta (USER). */
    private List<MensagemIa> historico(Long conversaId) {
        List<Mensagem> ultimas = new ArrayList<>(
                mensagemRepository.findByConversaIdOrderByIdDesc(conversaId, PageRequest.of(0, HISTORICO)));
        java.util.Collections.reverse(ultimas);
        while (!ultimas.isEmpty() && ultimas.get(0).getPapel() != PapelMensagem.USER) {
            ultimas.remove(0);
        }
        List<MensagemIa> lista = new ArrayList<>();
        ultimas.forEach(m -> lista.add(new MensagemIa(m.getPapel(), m.getConteudo())));
        return lista;
    }

    private long perguntasHoje(Long usuarioId) {
        OffsetDateTime inicioDoDia = LocalDate.now(clock).atStartOfDay(fuso).toOffsetDateTime();
        return mensagemRepository.contarPerguntasDesde(usuarioId, inicioDoDia);
    }

    private Conversa daConversa(Long usuarioId, Long conversaId) {
        return conversaRepository.findByIdAndUsuarioId(conversaId, usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));
    }

    private void garantirDisponivel() {
        if (!clienteIa.disponivel()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, INDISPONIVEL);
        }
    }
}
