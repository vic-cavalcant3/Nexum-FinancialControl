package com.nexum.api.usuario;

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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Tabela usuario (criada pela migration V1).
 * A entidade nunca vai direto para o JSON: o controller devolve um DTO (UsuarioResponse),
 * para o senha_hash nunca sair da API.
 */
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long id;

    @Column(name = "nome", nullable = false, length = 100)
    private String nome;

    @Column(name = "email", nullable = false, length = 150)
    private String email;

    @Column(name = "senha_hash", nullable = false)
    private String senhaHash;

    @Column(name = "telefone", length = 20)
    private String telefone;

    @Enumerated(EnumType.STRING)
    @Column(name = "papel", nullable = false, length = 10)
    private Papel papel = Papel.USER;

    @Column(name = "ativo", nullable = false)
    private boolean ativo = true;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    /** Último login (migration V3). Gravado por UsuarioRepository.registrarAcesso. */
    @Column(name = "ultimo_acesso")
    private OffsetDateTime ultimoAcesso;

    /** Exigido pelo JPA. Use o outro construtor no código. */
    protected Usuario() {
    }

    public Usuario(String nome, String email, String senhaHash) {
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
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

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public void setSenhaHash(String senhaHash) {
        this.senhaHash = senhaHash;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public Papel getPapel() {
        return papel;
    }

    public void setPapel(Papel papel) {
        this.papel = papel;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public void setAtivo(boolean ativo) {
        this.ativo = ativo;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }

    public OffsetDateTime getAtualizadoEm() {
        return atualizadoEm;
    }

    public OffsetDateTime getUltimoAcesso() {
        return ultimoAcesso;
    }
}
