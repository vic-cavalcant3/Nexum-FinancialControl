-- =====================================================================
-- Descrição curta da categoria (opcional), ex.: "Academia e suplementos".
-- Aparece no card da categoria na tela Planejamento.
-- =====================================================================
ALTER TABLE categoria ADD COLUMN descricao VARCHAR(60);
