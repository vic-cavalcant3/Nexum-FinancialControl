package com.nexum.api.consultor;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/** Tabela mensagem (V5): uma pergunta (USER) ou resposta (ASSISTANT) de uma conversa. */
@Entity
@Table(name = "mensagem")
public class Mensagem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "conversa_id", nullable = false, updatable = false)
    private Long conversaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "papel", nullable = false, length = 10)
    private PapelMensagem papel;

    @Column(name = "conteudo", nullable = false, columnDefinition = "text")
    private String conteudo;

    /** Tokens de entrada/saída informados pela Anthropic (só nas respostas). */
    @Column(name = "tokens_entrada")
    private Integer tokensEntrada;

    @Column(name = "tokens_saida")
    private Integer tokensSaida;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    protected Mensagem() {
    }

    public Mensagem(Long conversaId, PapelMensagem papel, String conteudo, Integer tokensEntrada, Integer tokensSaida) {
        this.conversaId = conversaId;
        this.papel = papel;
        this.conteudo = conteudo;
        this.tokensEntrada = tokensEntrada;
        this.tokensSaida = tokensSaida;
    }

    @PrePersist
    void aoCriar() {
        this.criadoEm = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public Long getId() {
        return id;
    }

    public Long getConversaId() {
        return conversaId;
    }

    public PapelMensagem getPapel() {
        return papel;
    }

    public String getConteudo() {
        return conteudo;
    }

    public Integer getTokensEntrada() {
        return tokensEntrada;
    }

    public Integer getTokensSaida() {
        return tokensSaida;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }
}
