CREATE TABLE `PlanUsage` (
  `accountId` VARCHAR(30) NOT NULL,
  `month` VARCHAR(7) NOT NULL,
  `submissions` INTEGER NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`accountId`, `month`),
  CONSTRAINT `PlanUsage_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BrandSettings` (
  `accountId` VARCHAR(30) NOT NULL,
  `name` VARCHAR(60) NOT NULL,
  `accent` VARCHAR(7) NOT NULL,
  `hideAttribution` BOOLEAN NOT NULL DEFAULT false,
  `logo` BLOB NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`accountId`),
  CONSTRAINT `BrandSettings_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
