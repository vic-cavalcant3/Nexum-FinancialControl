package com.nexum.api.orcamento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import com.nexum.api.categoria.Categoria;

/**
 * Tabela orcamento: "em {mesReferencia}, posso gastar até {limite} em {categoria}".
 * mesReferencia é sempre o dia 1 do mês (CHECK no banco).
 */
@Entity
@Table(name = "orcamento")
public class Orcamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_orcamento")
    private Long id;

    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @Column(name = "mes_referencia", nullable = false)
    private LocalDate mesReferencia;

    @Column(name = "limite", nullable = false, precision = 12, scale = 2)
    private BigDecimal limite;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    protected Orcamento() {
    }

    public Orcamento(Long usuarioId, Categoria categoria, LocalDate mesReferencia, BigDecimal limite) {
        this.usuarioId = usuarioId;
        this.categoria = categoria;
        this.mesReferencia = mesReferencia;
        this.limite = limite;
    }

    @PrePersist
    void aoCriar() {
        OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC);
        this.criadoEm = agora;
        this.atualizadoEm = agora;
    }

    @PreUpdate
    void aoAtualizar() {
        this.atualizadoEm = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public Long getId() {
        return id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public Categoria getCategoria() {
        return categoria;
    }

    public LocalDate getMesReferencia() {
        return mesReferencia;
    }

    public BigDecimal getLimite() {
        return limite;
    }
}
