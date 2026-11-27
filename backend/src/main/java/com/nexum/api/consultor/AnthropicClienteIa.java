package com.nexum.api.consultor;

import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Component;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicException;
import com.anthropic.errors.AnthropicIoException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.OutputConfig;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.TextBlock;
import com.anthropic.models.messages.TextBlockParam;

/**
 * {@link ClienteIa} de produção: chama a API do Claude com o SDK oficial da Anthropic.
 * <p>
 * A chave vem de ANTHROPIC_API_KEY (via {@link ConsultorProperties}) e nunca é logada.
 * Sem chave, {@link #disponivel()} é false e nada é chamado.
 */
@Component
public class AnthropicClienteIa implements ClienteIa, DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(AnthropicClienteIa.class);

    /** Resposta usada quando o modelo recusa o pedido (stop_reason "refusal"). */
    static final String RESPOSTA_RECUSA =
            "Desculpe, não posso ajudar com esse pedido. Posso te ajudar com dúvidas sobre os seus gastos, orçamento e metas.";

    private final ConsultorProperties props;
    private final AnthropicClient client;

    public AnthropicClienteIa(ConsultorProperties props) {
        this.props = props;
        if (props.temChave()) {
            this.client = AnthropicOkHttpClient.builder()
                    .apiKey(props.apiKey().trim())
                    .timeout(Duration.ofSeconds(props.timeoutSegundos()))
                    // Sem novas tentativas: a pessoa está esperando na tela, e o timeout já é de 60 s.
                    .maxRetries(0)
                    .build();
            log.info("Consultor IA ativo: modelo {}, até {} tokens por resposta.", props.modelo(), props.maxTokens());
        } else {
            this.client = null;
            log.warn("ANTHROPIC_API_KEY não configurada: as rotas /api/consultor vão responder 503.");
        }
    }

    @Override
    public boolean disponivel() {
        return client != null;
    }

    @Override
    public RespostaIa responder(String instrucoes, String dados, List<MensagemIa> mensagens) {
        if (client == null) {
            throw new IaIndisponivelException("ANTHROPIC_API_KEY ausente", null);
        }

        MessageCreateParams.Builder pedido = MessageCreateParams.builder()
                .model(props.modelo())
                .maxTokens(props.maxTokens())
                // Regras fixas primeiro, dados do usuário depois (mudam a cada pergunta).
                .systemOfTextBlockParams(List.of(
                        TextBlockParam.builder().text(instrucoes).build(),
                        TextBlockParam.builder().text(dados).build()))
                // Conversa simples: esforço baixo responde rápido e gasta menos tokens.
                .outputConfig(OutputConfig.builder().effort(OutputConfig.Effort.LOW).build());
        for (MensagemIa m : mensagens) {
            if (m.papel() == PapelMensagem.USER) {
                pedido.addUserMessage(m.texto());
            } else {
                pedido.addAssistantMessage(m.texto());
            }
        }

        Message resposta;
        try {
            resposta = client.messages().create(pedido.build());
        } catch (RateLimitException e) {
            log.warn("Consultor IA: limite de uso da Anthropic atingido (HTTP 429).");
            throw new IaIndisponivelException("limite da Anthropic", e);
        } catch (AnthropicServiceException e) {
            log.warn("Consultor IA: a Anthropic respondeu HTTP {} ({}).", e.statusCode(),
                    e.errorType().map(Object::toString).orElse("sem tipo"));
            throw new IaIndisponivelException("erro da Anthropic", e);
        } catch (AnthropicIoException e) {
            log.warn("Consultor IA: falha de rede ou tempo esgotado ao chamar a Anthropic.");
            throw new IaIndisponivelException("falha de rede", e);
        } catch (AnthropicException e) {
            log.warn("Consultor IA: erro inesperado do SDK da Anthropic ({}).", e.getClass().getSimpleName());
            throw new IaIndisponivelException("erro do SDK", e);
        }

        Integer entrada = (int) resposta.usage().inputTokens();
        Integer saida = (int) resposta.usage().outputTokens();
        StopReason motivo = resposta.stopReason().orElse(null);

        if (StopReason.REFUSAL.equals(motivo)) {
            return new RespostaIa(RESPOSTA_RECUSA, entrada, saida);
        }
        String texto = resposta.content().stream()
                .flatMap(bloco -> bloco.text().stream())
                .map(TextBlock::text)
                .collect(Collectors.joining("\n\n"))
                .strip();
        if (texto.isEmpty()) {
            log.warn("Consultor IA: resposta sem texto (stop_reason {}).", motivo);
            throw new IaIndisponivelException("resposta vazia", null);
        }
        if (StopReason.MAX_TOKENS.equals(motivo)) {
            log.info("Consultor IA: resposta cortada em CONSULTOR_MAX_TOKENS ({}).", props.maxTokens());
        }
        return new RespostaIa(texto, entrada, saida);
    }

    @Override
    public void destroy() {
        if (client != null) {
            client.close();
        }
    }
}
