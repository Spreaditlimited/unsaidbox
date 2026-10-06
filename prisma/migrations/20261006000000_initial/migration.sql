-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(30) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `emailVerifiedAt` DATETIME(3) NULL,
    `passwordHash` VARCHAR(256) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'USER',
    `username` VARCHAR(30) NOT NULL,
    `displayName` VARCHAR(80) NOT NULL,
    `introduction` VARCHAR(500) NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `publicPageEnabled` BOOLEAN NOT NULL DEFAULT false,
    `inboxOpen` BOOLEAN NOT NULL DEFAULT true,
    `inboxSharingPolicy` ENUM('OWNER_MAY_SHARE', 'PRIVATE_ONLY') NOT NULL DEFAULT 'OWNER_MAY_SHARE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Account_email_key`(`email`),
    UNIQUE INDEX `Account_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Question` (
    `id` VARCHAR(30) NOT NULL,
    `accountId` VARCHAR(30) NOT NULL,
    `body` TEXT NOT NULL,
    `linkActive` BOOLEAN NOT NULL DEFAULT true,
    `acceptingResponses` BOOLEAN NOT NULL DEFAULT true,
    `publicVisible` BOOLEAN NOT NULL DEFAULT false,
    `discoverable` BOOLEAN NOT NULL DEFAULT false,
    `discoveryApproved` BOOLEAN NOT NULL DEFAULT false,
    `sharingPolicy` ENUM('OWNER_MAY_SHARE', 'PRIVATE_ONLY') NOT NULL DEFAULT 'OWNER_MAY_SHARE',
    `socialPostUrl` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Question_accountId_createdAt_idx`(`accountId`, `createdAt`),
    UNIQUE INDEX `Question_id_accountId_key`(`id`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Submission` (
    `id` VARCHAR(30) NOT NULL,
    `accountId` VARCHAR(30) NOT NULL,
    `questionId` VARCHAR(30) NULL,
    `body` TEXT NOT NULL,
    `ownerReply` TEXT NULL,
    `publicBody` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'ARCHIVED', 'SPAM') NOT NULL DEFAULT 'PENDING',
    `publicVisible` BOOLEAN NOT NULL DEFAULT false,
    `sharingPolicy` ENUM('OWNER_MAY_SHARE', 'PRIVATE_ONLY') NOT NULL DEFAULT 'OWNER_MAY_SHARE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Submission_accountId_status_createdAt_idx`(`accountId`, `status`, `createdAt`),
    INDEX `Submission_questionId_accountId_publicVisible_idx`(`questionId`, `accountId`, `publicVisible`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `tokenHash` VARCHAR(64) NOT NULL,
    `accountId` VARCHAR(30) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `Session_accountId_idx`(`accountId`),
    PRIMARY KEY (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthToken` (
    `tokenHash` VARCHAR(64) NOT NULL,
    `accountId` VARCHAR(30) NOT NULL,
    `purpose` VARCHAR(20) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `AuthToken_accountId_idx`(`accountId`),
    PRIMARY KEY (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateLimit` (
    `key` VARCHAR(64) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `expiresAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(30) NOT NULL,
    `questionId` VARCHAR(30) NULL,
    `submissionId` VARCHAR(30) NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` VARCHAR(30) NOT NULL,
    `actorId` VARCHAR(30) NOT NULL,
    `action` VARCHAR(80) NOT NULL,
    `targetId` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_questionId_accountId_fkey` FOREIGN KEY (`questionId`, `accountId`) REFERENCES `Question`(`id`, `accountId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuthToken` ADD CONSTRAINT `AuthToken_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
