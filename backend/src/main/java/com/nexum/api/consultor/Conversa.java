package com.nexum.api.consultor;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/** Tabela conversa (V5): uma conversa do usuário com o Consultor IA. */
@Entity
@Table(name = "conversa")
public class Conversa {

    /** O título é o começo da primeira pergunta. */
    public static final int TAMANHO_TITULO = 40;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    @Column(name = "titulo", length = 60)
    private String titulo;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    protected Conversa() {
    }

    public Conversa(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    @PrePersist
    void aoCriar() {
        OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC);
        this.criadoEm = agora;
        this.atualizadoEm = agora;
    }

    /** Nova mensagem: sobe a conversa na lista e, se ainda não tem título, usa a pergunta. */
    public void registrarPergunta(String pergunta) {
        if (titulo == null) {
            titulo = tituloDe(pergunta);
        }
        atualizadoEm = OffsetDateTime.now(ZoneOffset.UTC);
    }

    /** Primeiros 40 caracteres da pergunta, numa linha só. */
    static String tituloDe(String pergunta) {
        String limpo = pergunta.strip().replaceAll("\\s+", " ");
        if (limpo.length() <= TAMANHO_TITULO) {
            return limpo;
        }
        // Não corta um emoji (par surrogate) ao meio.
        int fim = TAMANHO_TITULO;
        if (Character.isHighSurrogate(limpo.charAt(fim - 1))) {
            fim--;
        }
        return limpo.substring(0, fim).strip();
    }

    public Long getId() {
        return id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public String getTitulo() {
        return titulo;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }

    public OffsetDateTime getAtualizadoEm() {
        return atualizadoEm;
    }
}
