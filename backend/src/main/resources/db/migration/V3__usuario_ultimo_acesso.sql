-- =====================================================================
-- Último acesso do usuário (atualizado a cada login).
-- Usado no painel de admin ("Ativos em 7 dias" e coluna "Último acesso").
-- NULL = nunca fez login depois desta migration.
-- =====================================================================
ALTER TABLE usuario ADD COLUMN ultimo_acesso TIMESTAMPTZ;

-- "Ativos nos últimos 7 dias": WHERE ultimo_acesso >= ?
CREATE INDEX idx_usuario_ultimo_acesso ON usuario (ultimo_acesso);
