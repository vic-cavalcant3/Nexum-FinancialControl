package com.nexum.api.meta;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexum.api.common.Dinheiro;
import com.nexum.api.common.RecursoNaoEncontradoException;
import com.nexum.api.common.RequisicaoInvalidaException;
import com.nexum.api.meta.dto.MetaRequest;
import com.nexum.api.meta.dto.MetaResponse;

@Service
public class MetaService {

    static final String NAO_ENCONTRADA = "Meta não encontrada.";

    private final MetaRepository metaRepository;
    private final Clock clock;

    public MetaService(MetaRepository metaRepository, Clock clock) {
        this.metaRepository = metaRepository;
        this.clock = clock;
    }

    /** Metas do usuário, da data prevista mais próxima para a mais distante. */
    @Transactional(readOnly = true)
    public List<MetaResponse> listar(Long usuarioId) {
        return metaRepository.findByUsuarioIdOrderByDataPrazoAscIdAsc(usuarioId).stream().map(MetaResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public MetaResponse buscar(Long usuarioId, Long id) {
        return MetaResponse.de(buscarDoUsuario(usuarioId, id));
    }

    @Transactional
    public MetaResponse criar(Long usuarioId, MetaRequest dados) {
        Meta meta = new Meta(usuarioId);
        // Padrões da criação
        meta.setValorAtual(Dinheiro.ZERO);
        meta.setAporteMensal(Dinheiro.ZERO);
        meta.setDataInicio(LocalDate.now(clock));
        preencher(meta, dados);
        metaRepository.save(meta);
        return MetaResponse.de(meta);
    }

    @Transactional
    public MetaResponse atualizar(Long usuarioId, Long id, MetaRequest dados) {
        Meta meta = buscarDoUsuario(usuarioId, id);
        preencher(meta, dados);
        metaRepository.flush();
        return MetaResponse.de(meta);
    }

    @Transactional
    public void excluir(Long usuarioId, Long id) {
        metaRepository.delete(buscarDoUsuario(usuarioId, id));
    }

    private Meta buscarDoUsuario(Long usuarioId, Long id) {
        return metaRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));
    }

    /** Obrigatórios sempre sobrescrevem; opcionais só quando vêm preenchidos. */
    private void preencher(Meta meta, MetaRequest dados) {
        meta.setDescricao(dados.descricao().trim());
        meta.setValorAlvo(Dinheiro.de(dados.valorAlvo()));
        meta.setDataPrazo(dados.dataPrazo());
        if (dados.valorAtual() != null) {
            meta.setValorAtual(Dinheiro.de(dados.valorAtual()));
        }
        if (dados.aporteMensal() != null) {
            meta.setAporteMensal(Dinheiro.de(dados.aporteMensal()));
        }
        if (dados.dataInicio() != null) {
            meta.setDataInicio(dados.dataInicio());
        }
        if (dados.statusMeta() != null) {
            meta.setStatusMeta(dados.statusMeta());
        }
        if (dados.icone() != null) {
            meta.setIcone(dados.icone().isBlank() ? null : dados.icone().trim());
        }

        if (meta.getDataPrazo().isBefore(meta.getDataInicio())) {
            throw new RequisicaoInvalidaException("A data prevista não pode ser antes da data de início.");
        }
    }
}
