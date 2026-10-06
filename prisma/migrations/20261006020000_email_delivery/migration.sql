CREATE TABLE `EmailPreference` (
  `accountId` VARCHAR(30) NOT NULL,
  `newMessages` BOOLEAN NOT NULL DEFAULT false,
  `moderationReports` BOOLEAN NOT NULL DEFAULT false,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`accountId`),
  CONSTRAINT `EmailPreference_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EmailDelivery` (
  `id` VARCHAR(30) NOT NULL,
  `accountId` VARCHAR(30) NOT NULL,
  `kind` VARCHAR(30) NOT NULL,
  `dedupeKey` VARCHAR(64) NOT NULL,
  `payload` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lockedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `sentAt` DATETIME(3) NULL,
  `lastError` VARCHAR(40) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `EmailDelivery_dedupeKey_key` (`dedupeKey`),
  INDEX `EmailDelivery_status_nextAttemptAt_idx` (`status`, `nextAttemptAt`),
  INDEX `EmailDelivery_accountId_createdAt_idx` (`accountId`, `createdAt`),
  CONSTRAINT `EmailDelivery_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
