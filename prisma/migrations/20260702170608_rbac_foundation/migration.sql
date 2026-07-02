/*
  Warnings:

  - You are about to drop the column `description` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `newValues` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `oldValues` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_roleId_fkey`;

-- DropIndex
DROP INDEX `activity_logs_entityType_idx` ON `activity_logs`;

-- DropIndex
DROP INDEX `users_roleId_idx` ON `users`;

-- AlterTable
ALTER TABLE `activity_logs` DROP COLUMN `description`,
    DROP COLUMN `entityId`,
    DROP COLUMN `entityType`,
    DROP COLUMN `newValues`,
    DROP COLUMN `oldValues`,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `resource` VARCHAR(191) NULL,
    ADD COLUMN `resourceId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `roles` ADD COLUMN `isProtected` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isSystem` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `user_sessions` ADD COLUMN `lastActivity` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `roleId`,
    ADD COLUMN `passwordChangedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_roles_userId_idx`(`userId`),
    INDEX `user_roles_roleId_idx`(`roleId`),
    UNIQUE INDEX `user_roles_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `resource` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_name_key`(`name`),
    UNIQUE INDEX `permissions_slug_key`(`slug`),
    INDEX `permissions_resource_idx`(`resource`),
    INDEX `permissions_action_idx`(`action`),
    INDEX `permissions_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_roleId_idx`(`roleId`),
    INDEX `role_permissions_permissionId_idx`(`permissionId`),
    UNIQUE INDEX `role_permissions_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `activity_logs_userId_createdAt_idx` ON `activity_logs`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `activity_logs_resource_idx` ON `activity_logs`(`resource`);

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
