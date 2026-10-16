-- Reference migration for the seven manually installed customer-insights tables.
-- Do not execute against an existing installation without reconciling migration history.
-- No consent backfill; exactly one permission target is enforced by nested creation.

-- CreateTable
CREATE TABLE `AccountActivity` (
    `accountId` VARCHAR(30) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `lastDashboardAt` DATETIME(3) NULL,
    `firstQuestionAt` DATETIME(3) NULL,
    `firstFormAt` DATETIME(3) NULL,
    `firstResponseAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AccountActivity_lastDashboardAt_idx`(`lastDashboardAt`),
    PRIMARY KEY (`accountId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedbackEntryReview` (
    `entryId` VARCHAR(30) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'NEW',
    `starred` BOOLEAN NOT NULL DEFAULT false,
    `tags` JSON NULL,
    `note` TEXT NULL,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeedbackEntryReview_status_idx`(`status`),
    INDEX `FeedbackEntryReview_starred_idx`(`starred`),
    PRIMARY KEY (`entryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExportPreset` (
    `id` VARCHAR(30) NOT NULL,
    `accountId` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `source` VARCHAR(20) NOT NULL,
    `purpose` VARCHAR(20) NOT NULL DEFAULT 'SHARING',
    `format` VARCHAR(20) NOT NULL DEFAULT 'CSV',
    `layout` VARCHAR(20) NOT NULL DEFAULT 'LONG',
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'UTC',
    `filters` JSON NOT NULL,
    `columns` JSON NOT NULL,
    `schemaVersion` INTEGER NOT NULL DEFAULT 1,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExportPreset_accountId_updatedAt_idx`(`accountId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExportJob` (
    `id` VARCHAR(30) NOT NULL,
    `accountId` VARCHAR(30) NOT NULL,
    `requestKey` VARCHAR(64) NOT NULL,
    `source` VARCHAR(20) NOT NULL,
    `purpose` VARCHAR(20) NOT NULL DEFAULT 'SHARING',
    `format` VARCHAR(20) NOT NULL DEFAULT 'CSV',
    `layout` VARCHAR(20) NOT NULL DEFAULT 'LONG',
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'UTC',
    `filters` JSON NOT NULL,
    `columns` JSON NOT NULL,
    `schemaVersion` INTEGER NOT NULL DEFAULT 1,
    `policyVersion` VARCHAR(40) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    `snapshotAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `checkpoint` JSON NULL,
    `matchingRecords` INTEGER NULL,
    `eligibleRecords` INTEGER NULL,
    `excludedRecords` INTEGER NULL,
    `processedRecords` INTEGER NOT NULL DEFAULT 0,
    `outputRows` INTEGER NOT NULL DEFAULT 0,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockToken` VARCHAR(64) NULL,
    `lockedUntil` DATETIME(3) NULL,
    `lastErrorCode` VARCHAR(80) NULL,
    `storageKey` VARCHAR(1000) NULL,
    `fileName` VARCHAR(200) NULL,
    `mimeType` VARCHAR(100) NULL,
    `fileBytes` BIGINT NULL,
    `checksumSha256` VARCHAR(64) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `lastDownloadedAt` DATETIME(3) NULL,
    `downloadCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExportJob_accountId_createdAt_idx`(`accountId`, `createdAt`),
    INDEX `ExportJob_accountId_status_idx`(`accountId`, `status`),
    INDEX `ExportJob_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    INDEX `ExportJob_lockedUntil_idx`(`lockedUntil`),
    INDEX `ExportJob_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `ExportJob_accountId_requestKey_key`(`accountId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResponseExportPermission` (
    `id` VARCHAR(30) NOT NULL,
    `submissionId` VARCHAR(30) NULL,
    `entryId` VARCHAR(30) NULL,
    `noticeVersion` VARCHAR(40) NOT NULL,
    `privateAnalysisAllowed` BOOLEAN NOT NULL DEFAULT false,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ResponseExportPermission_submissionId_key`(`submissionId`),
    UNIQUE INDEX `ResponseExportPermission_entryId_key`(`entryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdministratorCustomerNote` (
    `id` VARCHAR(30) NOT NULL,
    `accountId` VARCHAR(30) NOT NULL,
    `administratorId` VARCHAR(30) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdministratorCustomerNote_accountId_createdAt_idx`(`accountId`, `createdAt`),
    INDEX `AdministratorCustomerNote_administratorId_idx`(`administratorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BillingHistory` (
    `id` VARCHAR(30) NOT NULL,
    `customerId` VARCHAR(64) NOT NULL,
    `mode` VARCHAR(10) NOT NULL,
    `provider` VARCHAR(20) NOT NULL DEFAULT 'STRIPE',
    `eventKey` VARCHAR(255) NOT NULL,
    `eventType` VARCHAR(100) NOT NULL,
    `objectId` VARCHAR(255) NULL,
    `subscriptionId` VARCHAR(255) NULL,
    `status` VARCHAR(40) NULL,
    `currency` VARCHAR(3) NULL,
    `amountPaid` BIGINT NULL,
    `amountRefunded` BIGINT NULL,
    `taxAmount` BIGINT NULL,
    `summary` JSON NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BillingHistory_customerId_occurredAt_idx`(`customerId`, `occurredAt`),
    INDEX `BillingHistory_mode_eventType_occurredAt_idx`(`mode`, `eventType`, `occurredAt`),
    INDEX `BillingHistory_subscriptionId_idx`(`subscriptionId`),
    UNIQUE INDEX `BillingHistory_provider_mode_eventKey_key`(`provider`, `mode`, `eventKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AccountActivity` ADD CONSTRAINT `AccountActivity_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedbackEntryReview` ADD CONSTRAINT `FeedbackEntryReview_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `FeedbackEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExportPreset` ADD CONSTRAINT `ExportPreset_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExportJob` ADD CONSTRAINT `ExportJob_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResponseExportPermission` ADD CONSTRAINT `ResponseExportPermission_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `Submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResponseExportPermission` ADD CONSTRAINT `ResponseExportPermission_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `FeedbackEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdministratorCustomerNote` ADD CONSTRAINT `AdministratorCustomerNote_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdministratorCustomerNote` ADD CONSTRAINT `AdministratorCustomerNote_administratorId_fkey` FOREIGN KEY (`administratorId`) REFERENCES `Administrator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillingHistory` ADD CONSTRAINT `BillingHistory_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `BillingCustomer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
