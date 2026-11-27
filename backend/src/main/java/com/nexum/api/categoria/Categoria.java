package com.nexum.api.categoria;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import com.nexum.api.common.TipoTransacao;

/**
 * Tabela categoria. {@code usuarioId == null} = categoria padrão (global, da migration V2),
 * visível para todos e que ninguém pode apagar.
 */
@Entity
@Table(name = "categoria")
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /** Dono da categoria; null nas categorias padrão. */
    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(name = "nome", nullable = false, length = 60)
    private String nome;

    /** Gravado como "receita"/"despesa" pelo TipoTransacaoConverter. */
    @Column(name = "tipo", nullable = false, length = 10)
    private TipoTransacao tipo;

    @Column(name = "icone", length = 50)
    private String icone;

    /** Descrição curta opcional (V4), ex.: "Academia e suplementos". */
    @Column(name = "descricao", length = 60)
    private String descricao;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    protected Categoria() {
    }

    public Categoria(Long usuarioId, String nome, TipoTransacao tipo, String icone) {
        this(usuarioId, nome, tipo, icone, null);
    }

    public Categoria(Long usuarioId, String nome, TipoTransacao tipo, String icone, String descricao) {
        this.usuarioId = usuarioId;
        this.nome = nome;
        this.tipo = tipo;
        this.icone = icone;
        this.descricao = descricao;
    }

    /** Edição pelo dono (o tipo não muda). */
    public void atualizar(String nome, String descricao, String icone) {
        this.nome = nome;
        this.descricao = descricao;
        this.icone = icone;
    }

    @PrePersist
    void aoCriar() {
        this.criadoEm = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public boolean isPadrao() {
        return usuarioId == null;
    }

    /** O usuário pode USAR a categoria (padrão ou dele)? */
    public boolean visivelPara(Long idUsuario) {
        return usuarioId == null || usuarioId.equals(idUsuario);
    }

    public Long getId() {
        return id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public String getNome() {
        return nome;
    }

    public TipoTransacao getTipo() {
        return tipo;
    }

    public String getIcone() {
        return icone;
    }

    public String getDescricao() {
        return descricao;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }
}
