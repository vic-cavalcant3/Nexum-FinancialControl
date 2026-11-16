-- =====================================================================
-- Categorias padrão (globais: usuario_id NULL), as mesmas que o front usa
-- (frontend/js/mock.js). O "icone" é a chave que o front usa para escolher o desenho.
-- =====================================================================

INSERT INTO categoria (usuario_id, nome, tipo, icone) VALUES
    (NULL, 'Alimentação',   'despesa', 'utensils'),
    (NULL, 'Moradia',       'despesa', 'home'),
    (NULL, 'Transporte',    'despesa', 'car'),
    (NULL, 'Lazer',         'despesa', 'film'),
    (NULL, 'Saúde',         'despesa', 'heart'),
    (NULL, 'Educação',      'despesa', 'book'),
    (NULL, 'Compras',       'despesa', 'bag'),
    (NULL, 'Outros',        'despesa', 'dots'),
    (NULL, 'Receita',       'receita', 'wallet'),
    (NULL, 'Salário',       'receita', 'wallet'),
    (NULL, 'Freelance',     'receita', 'briefcase'),
    (NULL, 'Investimentos', 'receita', 'trending-up');
