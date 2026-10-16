-- Public email opt-ins remain separate from personal accounts and submissions.
CREATE TABLE `MarketingLead` (
  `id` VARCHAR(30) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `firstName` VARCHAR(80) NOT NULL,
  `subscribed` BOOLEAN NOT NULL DEFAULT false,
  `consentStatement` VARCHAR(500) NOT NULL,
  `consentVersion` VARCHAR(40) NOT NULL,
  `consentedAt` DATETIME(3) NOT NULL,
  `requestedAt` DATETIME(3) NOT NULL,
  `confirmedAt` DATETIME(3) NULL,
  `withdrawnAt` DATETIME(3) NULL,
  `tokenHash` VARCHAR(64) NULL,
  `tokenExpiresAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MarketingLead_email_key` (`email`),
  UNIQUE INDEX `MarketingLead_tokenHash_key` (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketingLeadEvent` (
  `id` VARCHAR(30) NOT NULL,
  `leadId` VARCHAR(30) NOT NULL,
  `choice` VARCHAR(30) NOT NULL,
  `statement` VARCHAR(500) NOT NULL,
  `version` VARCHAR(40) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `MarketingLeadEvent_leadId_createdAt_idx` (`leadId`, `createdAt`),
  CONSTRAINT `MarketingLeadEvent_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `MarketingLead` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
