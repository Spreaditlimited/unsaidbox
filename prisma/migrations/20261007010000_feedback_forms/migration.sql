-- Additive migration: new UnsaidBox feedback-form tables only.
-- CreateTable
CREATE TABLE `FeedbackForm` (
    `id` VARCHAR(30) NOT NULL,
    `accountId` VARCHAR(30) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` VARCHAR(600) NOT NULL,
    `thankYou` VARCHAR(300) NOT NULL,
    `templateId` VARCHAR(40) NOT NULL,
    `questions` JSON NOT NULL,
    `theme` VARCHAR(20) NOT NULL DEFAULT 'lavender',
    `allowSharing` BOOLEAN NOT NULL DEFAULT false,
    `locked` BOOLEAN NOT NULL DEFAULT false,
    `linkActive` BOOLEAN NOT NULL DEFAULT false,
    `acceptingResponses` BOOLEAN NOT NULL DEFAULT false,
    `blocked` BOOLEAN NOT NULL DEFAULT false,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `responseCount` INTEGER NOT NULL DEFAULT 0,
    `image` BLOB NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FeedbackForm_accountId_createdAt_idx`(`accountId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedbackEntry` (
    `id` VARCHAR(30) NOT NULL,
    `formId` VARCHAR(30) NOT NULL,
    `requestKey` VARCHAR(36) NOT NULL,
    `shareAllowed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeedbackEntry_formId_createdAt_idx`(`formId`, `createdAt`),
    UNIQUE INDEX `FeedbackEntry_formId_requestKey_key`(`formId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedbackAnswer` (
    `id` VARCHAR(30) NOT NULL,
    `entryId` VARCHAR(30) NOT NULL,
    `questionId` VARCHAR(50) NOT NULL,
    `label` VARCHAR(240) NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `textValue` TEXT NULL,
    `numberValue` INTEGER NULL,

    UNIQUE INDEX `FeedbackAnswer_entryId_questionId_key`(`entryId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FeedbackForm` ADD CONSTRAINT `FeedbackForm_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedbackEntry` ADD CONSTRAINT `FeedbackEntry_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `FeedbackForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedbackAnswer` ADD CONSTRAINT `FeedbackAnswer_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `FeedbackEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
