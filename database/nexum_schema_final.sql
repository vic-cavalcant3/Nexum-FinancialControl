-- ============================================================
-- NEXUM — Schema Final para Aiven (MySQL 8+ compatível)
-- Reconciliado entre: phpMyAdmin export + schema do backend
-- Corrigido para bater 100% com o Prisma schema
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ============================================================
-- TABELA: usuario
-- Corrigido: id_usuario INT (Prisma usa Int, não BIGINT)
--            nome VARCHAR(100) (igual ao Prisma)
--            email VARCHAR(150) (igual ao Prisma)
--            removidos: data_nascimento, email_verificado, ultimo_login, atualizado_em
--            (não existem no Prisma — deixar fora evita conflito)
-- ============================================================
CREATE TABLE `usuario` (
  `id_usuario`  INT           NOT NULL AUTO_INCREMENT,
  `nome`        VARCHAR(100)  NOT NULL,
  `email`       VARCHAR(150)  NOT NULL,
  `senha_hash`  VARCHAR(255)  NOT NULL,
  `telefone`    VARCHAR(20)   DEFAULT NULL,
  `ativo`       TINYINT(1)    NOT NULL DEFAULT 1,
  `criado_em`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: categoria
-- Nome no singular (@@map("categoria") no Prisma)
-- usuario_id: INT (bate com id_usuario INT acima)
-- tipo: VARCHAR (Prisma usa String, não ENUM)
-- ============================================================
CREATE TABLE `categoria` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `usuario_id`  INT          DEFAULT NULL,
  `nome`        VARCHAR(60)  NOT NULL,
  `tipo`        VARCHAR(20)  NOT NULL,   -- 'receita' ou 'despesa'
  `icone`       VARCHAR(50)  DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuario_cat` (`usuario_id`, `nome`, `tipo`),
  CONSTRAINT `fk_cat_usuario`
    FOREIGN KEY (`usuario_id`)
    REFERENCES `usuario` (`id_usuario`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categorias padrão (globais, usuario_id NULL)
INSERT INTO `categoria` (`usuario_id`, `nome`, `tipo`, `icone`) VALUES
(NULL, 'Salário',       'receita',  'wallet'),
(NULL, 'Renda Extra',   'receita',  'plus-circle'),
(NULL, 'Alimentação',   'despesa',  'utensils'),
(NULL, 'Transporte',    'despesa',  'car'),
(NULL, 'Moradia',       'despesa',  'house'),
(NULL, 'Saúde',         'despesa',  'heart-pulse'),
(NULL, 'Lazer',         'despesa',  'clapperboard'),
(NULL, 'Educação',      'despesa',  'book-open'),
(NULL, 'Assinaturas',   'despesa',  'repeat'),
(NULL, 'Investimentos', 'receita',  'trending-up'),
(NULL, 'Outros',        'despesa',  'more-horizontal');

-- ============================================================
-- TABELA: transacao
-- Nome no singular (@@map("transacao") no Prisma)
-- id_transacao: INT (igual ao Prisma)
-- usuario_id, categoria_id: INT
-- tipo: VARCHAR (Prisma usa String)
-- data: DATETIME (Prisma usa DateTime)
-- ============================================================
CREATE TABLE `transacao` (
  `id_transacao`  INT           NOT NULL AUTO_INCREMENT,
  `usuario_id`    INT           NOT NULL,
  `categoria_id`  INT           DEFAULT NULL,
  `tipo`          VARCHAR(20)   NOT NULL DEFAULT 'despesa',  -- 'receita' ou 'despesa'
  `descricao`     VARCHAR(255)  DEFAULT NULL,
  `valor`         DECIMAL(10,2) NOT NULL,
  `data`          DATETIME      NOT NULL,
  `criado_em`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id_transacao`),
  KEY `idx_usuario_data` (`usuario_id`, `data`),
  KEY `idx_usuario_tipo` (`usuario_id`, `tipo`),
  CONSTRAINT `fk_transacao_usuario`
    FOREIGN KEY (`usuario_id`)
    REFERENCES `usuario` (`id_usuario`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_transacao_categoria`
    FOREIGN KEY (`categoria_id`)
    REFERENCES `categoria` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: meta_financeira
-- (@@map("meta_financeira") no Prisma)
-- id_meta, id_usuario: INT
-- ============================================================
CREATE TABLE `meta_financeira` (
  `id_meta`       INT           NOT NULL AUTO_INCREMENT,
  `id_usuario`    INT           NOT NULL,
  `descricao`     VARCHAR(255)  NOT NULL,
  `valor_alvo`    DECIMAL(10,2) NOT NULL,
  `valor_atual`   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `aporte_mensal` DECIMAL(10,2) NOT NULL,
  `data_inicio`   DATE          NOT NULL,
  `data_prazo`    DATE          NOT NULL,
  `status_meta`   VARCHAR(30)   NOT NULL DEFAULT 'em_andamento',

  PRIMARY KEY (`id_meta`),
  CONSTRAINT `fk_meta_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuario` (`id_usuario`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: divida
-- (@@map("divida") no Prisma)
-- ============================================================
CREATE TABLE `divida` (
  `id_divida`               INT           NOT NULL AUTO_INCREMENT,
  `id_usuario`              INT           NOT NULL,
  `descricao`               VARCHAR(255)  NOT NULL,
  `credor`                  VARCHAR(100)  NOT NULL,
  `valor_total`             DECIMAL(10,2) NOT NULL,
  `valor_pago`              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `taxa_juros`              DECIMAL(5,2)  DEFAULT NULL,
  `data_inicio`             DATE          NOT NULL,
  `data_prevista_quitacao`  DATE          DEFAULT NULL,
  `status_divida`           VARCHAR(30)   NOT NULL DEFAULT 'pendente',

  PRIMARY KEY (`id_divida`),
  CONSTRAINT `fk_divida_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuario` (`id_usuario`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: planejamento_mensal
-- (@@map("planejamento_mensal") no Prisma)
-- saldo_final: sem GENERATED ALWAYS (Prisma não suporta)
-- ============================================================
CREATE TABLE `planejamento_mensal` (
  `id_planejamento`   INT           NOT NULL AUTO_INCREMENT,
  `id_usuario`        INT           NOT NULL,
  `mes_referencia`    DATE          NOT NULL,
  `receita_prevista`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `despesa_prevista`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `receita_realizada` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `despesa_realizada` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `saldo_final`       DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  PRIMARY KEY (`id_planejamento`),
  CONSTRAINT `fk_plan_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuario` (`id_usuario`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: alerta
-- (@@map("alerta") no Prisma)
-- tipo_alerta: VARCHAR (Prisma usa String, não ENUM)
-- ============================================================
CREATE TABLE `alerta` (
  `id_alerta`    INT           NOT NULL AUTO_INCREMENT,
  `id_usuario`   INT           NOT NULL,
  `mensagem`     VARCHAR(255)  NOT NULL,
  `tipo_alerta`  VARCHAR(30)   NOT NULL,  -- 'gasto', 'meta', 'divida', 'planejamento', 'sistema'
  `lido`         TINYINT(1)    NOT NULL DEFAULT 0,
  `data_criacao` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id_alerta`),
  CONSTRAINT `fk_alerta_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuario` (`id_usuario`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELA: relatorio
-- (@@map("relatorio") no Prisma)
-- tipo_relatorio: VARCHAR (Prisma usa String)
-- ============================================================
CREATE TABLE `relatorio` (
  `id_relatorio`   INT           NOT NULL AUTO_INCREMENT,
  `id_usuario`     INT           NOT NULL,
  `tipo_relatorio` VARCHAR(30)   NOT NULL,
  `periodo_inicio` DATE          NOT NULL,
  `periodo_fim`    DATE          NOT NULL,
  `criado_em`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id_relatorio`),
  CONSTRAINT `fk_relatorio_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuario` (`id_usuario`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;