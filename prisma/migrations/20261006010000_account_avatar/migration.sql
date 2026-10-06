CREATE TABLE `AccountAvatar` (
  `accountId` VARCHAR(30) NOT NULL,
  `image` BLOB NOT NULL,
  `version` VARCHAR(32) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`accountId`),
  CONSTRAINT `AccountAvatar_accountId_fkey` FOREIGN KEY (`accountId`)
    REFERENCES `Account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
