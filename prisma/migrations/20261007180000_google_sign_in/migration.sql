-- Additive personal-account authentication tables only. No billing changes.
CREATE TABLE `SocialIdentity` (
  `provider` VARCHAR(20) NOT NULL,
  `subject` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `accountId` VARCHAR(30) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`provider`, `subject`),
  UNIQUE INDEX `SocialIdentity_accountId_provider_key` (`accountId`, `provider`),
  CONSTRAINT `SocialIdentity_accountId_fkey` FOREIGN KEY (`accountId`)
    REFERENCES `Account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OAuthAttempt` (
  `tokenHash` VARCHAR(64) NOT NULL,
  `browserHash` VARCHAR(64) NOT NULL,
  `kind` VARCHAR(20) NOT NULL,
  `payload` JSON NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`tokenHash`),
  INDEX `OAuthAttempt_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
