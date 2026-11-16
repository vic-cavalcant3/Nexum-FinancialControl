package com.nexum.api.meta;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/** Tabela meta: um objetivo financeiro (ex.: "Viagem para Bali", R$ 5.000 até dez/2026). */
@Entity
@Table(name = "meta")
public class Meta {

    public static final String EM_ANDAMENTO = "em_andamento";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_meta")
    private Long id;

    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    /** Nome da meta (o front chama de "descricao"). */
    @Column(name = "descricao", nullable = false)
    private String descricao;

    @Column(name = "valor_alvo", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorAlvo;

    /** Quanto já foi guardado. */
    @Column(name = "valor_atual", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorAtual;

    /** Quanto o usuário pretende guardar por mês (o front usa para calcular o ritmo). */
    @Column(name = "aporte_mensal", nullable = false, precision = 12, scale = 2)
    private BigDecimal aporteMensal;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    /** Data prevista para alcançar a meta. */
    @Column(name = "data_prazo", nullable = false)
    private LocalDate dataPrazo;

    /** em_andamento, concluida ou cancelada. */
    @Column(name = "status_meta", nullable = false, length = 20)
    private String statusMeta = EM_ANDAMENTO;

    /** Chave do ícone no front: viagem, reserva, consumo, imovel, estudo, veiculo. */
    @Column(name = "icone", length = 30)
    private String icone;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    protected Meta() {
    }

    public Meta(Long usuarioId) {
        this.usuarioId = usuarioId;
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

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public BigDecimal getValorAlvo() {
        return valorAlvo;
    }

    public void setValorAlvo(BigDecimal valorAlvo) {
        this.valorAlvo = valorAlvo;
    }

    public BigDecimal getValorAtual() {
        return valorAtual;
    }

    public void setValorAtual(BigDecimal valorAtual) {
        this.valorAtual = valorAtual;
    }

    public BigDecimal getAporteMensal() {
        return aporteMensal;
    }

    public void setAporteMensal(BigDecimal aporteMensal) {
        this.aporteMensal = aporteMensal;
    }

    public LocalDate getDataInicio() {
        return dataInicio;
    }

    public void setDataInicio(LocalDate dataInicio) {
        this.dataInicio = dataInicio;
    }

    public LocalDate getDataPrazo() {
        return dataPrazo;
    }

    public void setDataPrazo(LocalDate dataPrazo) {
        this.dataPrazo = dataPrazo;
    }

    public String getStatusMeta() {
        return statusMeta;
    }

    public void setStatusMeta(String statusMeta) {
        this.statusMeta = statusMeta;
    }

    public String getIcone() {
        return icone;
    }

    public void setIcone(String icone) {
        this.icone = icone;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }
}
