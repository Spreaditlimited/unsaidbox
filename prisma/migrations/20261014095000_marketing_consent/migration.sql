-- Additive only: no existing account, email or submission data is changed.
CREATE TABLE `MarketingConsent` (
  `accountId` VARCHAR(30) NOT NULL,
  `subscribed` BOOLEAN NOT NULL DEFAULT false,
  `statement` VARCHAR(500) NOT NULL,
  `version` VARCHAR(40) NOT NULL,
  `source` VARCHAR(30) NOT NULL,
  `chosenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`accountId`),
  CONSTRAINT `MarketingConsent_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingConsentEvent` (
  `id` VARCHAR(30) NOT NULL,
  `accountId` VARCHAR(30) NOT NULL,
  `subscribed` BOOLEAN NOT NULL,
  `statement` VARCHAR(500) NOT NULL,
  `version` VARCHAR(40) NOT NULL,
  `source` VARCHAR(30) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `MarketingConsentEvent_accountId_createdAt_idx` (`accountId`, `createdAt`),
  CONSTRAINT `MarketingConsentEvent_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingControl` (
  `id` INTEGER NOT NULL,
  `revision` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO `MarketingControl` (`id`, `revision`) VALUES (1, 0);

CREATE TABLE `MarketingCampaign` (
  `id` VARCHAR(30) NOT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `heading` VARCHAR(200) NOT NULL,
  `preheader` VARCHAR(200) NOT NULL,
  `body` TEXT NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  `providerId` INTEGER NULL,
  `recipientCount` INTEGER NULL,
  `createdBy` VARCHAR(30) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `submittedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MarketingCampaign_providerId_key` (`providerId`),
  INDEX `MarketingCampaign_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
