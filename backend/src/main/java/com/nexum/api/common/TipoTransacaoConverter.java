package com.nexum.api.common;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Grava TipoTransacao no banco como "receita"/"despesa" (é o que o CHECK da tabela aceita). */
@Converter(autoApply = true)
public class TipoTransacaoConverter implements AttributeConverter<TipoTransacao, String> {

    @Override
    public String convertToDatabaseColumn(TipoTransacao tipo) {
        return tipo == null ? null : tipo.valor();
    }

    @Override
    public TipoTransacao convertToEntityAttribute(String valor) {
        return valor == null ? null : TipoTransacao.de(valor);
    }
}
