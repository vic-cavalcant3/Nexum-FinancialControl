-- CreateTable
CREATE TABLE `usuario` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `senha_hash` VARCHAR(255) NOT NULL,
    `telefone` VARCHAR(20) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuario_email_key`(`email`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NULL,
    `nome` VARCHAR(60) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `icone` VARCHAR(50) NULL,

    UNIQUE INDEX `categoria_usuario_id_nome_tipo_key`(`usuario_id`, `nome`, `tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transacao` (
    `id_transacao` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `categoria_id` INTEGER NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'despesa',
    `descricao` VARCHAR(255) NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `data` DATETIME(0) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_transacao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meta_financeira` (
    `id_meta` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `descricao` VARCHAR(255) NOT NULL,
    `valor_alvo` DECIMAL(10, 2) NOT NULL,
    `valor_atual` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `aporte_mensal` DECIMAL(10, 2) NOT NULL,
    `data_inicio` DATE NOT NULL,
    `data_prazo` DATE NOT NULL,
    `status_meta` VARCHAR(191) NOT NULL DEFAULT 'em_andamento',

    PRIMARY KEY (`id_meta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `divida` (
    `id_divida` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `descricao` VARCHAR(255) NOT NULL,
    `credor` VARCHAR(100) NOT NULL,
    `valor_total` DECIMAL(10, 2) NOT NULL,
    `valor_pago` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `taxa_juros` DECIMAL(5, 2) NULL,
    `data_inicio` DATE NOT NULL,
    `data_prevista_quitacao` DATE NULL,
    `status_divida` VARCHAR(191) NOT NULL DEFAULT 'pendente',

    PRIMARY KEY (`id_divida`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `planejamento_mensal` (
    `id_planejamento` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `mes_referencia` DATE NOT NULL,
    `receita_prevista` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `despesa_prevista` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `receita_realizada` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `despesa_realizada` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `saldo_final` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id_planejamento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alerta` (
    `id_alerta` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `mensagem` VARCHAR(255) NOT NULL,
    `tipo_alerta` VARCHAR(191) NOT NULL,
    `lido` BOOLEAN NOT NULL DEFAULT false,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_alerta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `relatorio` (
    `id_relatorio` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `tipo_relatorio` VARCHAR(191) NOT NULL,
    `periodo_inicio` DATE NOT NULL,
    `periodo_fim` DATE NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_relatorio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `categoria` ADD CONSTRAINT `categoria_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transacao` ADD CONSTRAINT `transacao_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transacao` ADD CONSTRAINT `transacao_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categoria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meta_financeira` ADD CONSTRAINT `meta_financeira_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `divida` ADD CONSTRAINT `divida_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planejamento_mensal` ADD CONSTRAINT `planejamento_mensal_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alerta` ADD CONSTRAINT `alerta_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relatorio` ADD CONSTRAINT `relatorio_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;
