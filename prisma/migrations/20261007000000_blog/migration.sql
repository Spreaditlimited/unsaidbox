-- Additive only. Run against the dedicated unsaidbox database, never the source website.
CREATE TABLE `BlogPost` (
  `id` VARCHAR(30) NOT NULL,
  `slug` VARCHAR(160) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `excerpt` VARCHAR(500) NOT NULL,
  `contentHtml` MEDIUMTEXT NOT NULL,
  `authorName` VARCHAR(100) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `seoTitle` VARCHAR(180) NOT NULL,
  `seoDescription` VARCHAR(320) NOT NULL,
  `imageAlt` VARCHAR(300) NOT NULL,
  `published` BOOLEAN NOT NULL DEFAULT false,
  `publishAt` DATETIME(3) NULL,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `imageLock` VARCHAR(64) NULL,
  `imageLockedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `BlogPost_slug_key` (`slug`),
  INDEX `BlogPost_published_publishAt_idx` (`published`, `publishAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BlogSlug` (
  `slug` VARCHAR(160) NOT NULL,
  `postId` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`slug`),
  INDEX `BlogSlug_postId_idx` (`postId`),
  CONSTRAINT `BlogSlug_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `BlogPost` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BlogImage` (
  `postId` VARCHAR(30) NOT NULL,
  `image` MEDIUMBLOB NOT NULL,
  `version` VARCHAR(32) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`postId`),
  CONSTRAINT `BlogImage_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `BlogPost` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
