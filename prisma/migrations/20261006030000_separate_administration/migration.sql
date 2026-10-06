CREATE TABLE `Administrator` (
  `id` VARCHAR(30) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `displayName` VARCHAR(80) NOT NULL,
  `passwordHash` VARCHAR(256) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Administrator_email_key` (`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdministratorSession` (
  `tokenHash` VARCHAR(64) NOT NULL,
  `administratorId` VARCHAR(30) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  INDEX `AdministratorSession_administratorId_idx` (`administratorId`),
  PRIMARY KEY (`tokenHash`),
  CONSTRAINT `AdministratorSession_administratorId_fkey` FOREIGN KEY (`administratorId`)
    REFERENCES `Administrator` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
