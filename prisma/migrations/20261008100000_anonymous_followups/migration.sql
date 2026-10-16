-- Run only in the dedicated UnsaidBox database. Additive: no existing data is changed.
USE `unsaidbox`;
CREATE TABLE `FollowupConversation` (
  `id` VARCHAR(30) NOT NULL,
  `accountId` VARCHAR(30) NOT NULL,
  `submissionId` VARCHAR(30) NULL,
  `entryId` VARCHAR(30) NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `closedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `messageCount` INTEGER NOT NULL DEFAULT 0,
  `lastSenderAt` DATETIME(3) NULL,
  `lastOwnerAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `FollowupConversation_submissionId_key` (`submissionId`),
  UNIQUE KEY `FollowupConversation_entryId_key` (`entryId`),
  UNIQUE KEY `FollowupConversation_tokenHash_key` (`tokenHash`),
  KEY `FollowupConversation_accountId_updatedAt_idx` (`accountId`, `updatedAt`),
  CONSTRAINT `FollowupConversation_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FollowupConversation_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `Submission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FollowupConversation_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `FeedbackEntry` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `FollowupMessage` (
  `id` VARCHAR(30) NOT NULL,
  `conversationId` VARCHAR(30) NOT NULL,
  `author` VARCHAR(10) NOT NULL,
  `body` TEXT NOT NULL,
  `requestKey` VARCHAR(36) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `FollowupMessage_conversationId_requestKey_key` (`conversationId`, `requestKey`),
  KEY `FollowupMessage_conversationId_createdAt_idx` (`conversationId`, `createdAt`),
  CONSTRAINT `FollowupMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `FollowupConversation` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
