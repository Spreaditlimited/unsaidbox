CREATE TABLE `BillingCustomer` (
  `id` VARCHAR(64) NOT NULL, `accountId` VARCHAR(30) NOT NULL,
  `mode` VARCHAR(10) NOT NULL, `stripeCustomerId` VARCHAR(255) NULL,
  `lockToken` VARCHAR(64) NULL, `lockUntil` DATETIME(3) NULL,
  `checkoutKey` VARCHAR(64) NULL, `checkoutParams` JSON NULL,
  `checkoutStartedAt` DATETIME(3) NULL, `checkoutSessionId` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `BillingCustomer_accountId_mode_key` (`accountId`, `mode`),
  UNIQUE INDEX `BillingCustomer_mode_stripeCustomerId_key` (`mode`, `stripeCustomerId`),
  CONSTRAINT `BillingCustomer_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BillingPrice` (
  `id` VARCHAR(64) NOT NULL, `mode` VARCHAR(10) NOT NULL, `catalogRevision` INTEGER NOT NULL,
  `priceKey` VARCHAR(30) NOT NULL, `stripePriceId` VARCHAR(255) NOT NULL, `stripeProductId` VARCHAR(255) NOT NULL,
  `amount` INTEGER NOT NULL, `currency` VARCHAR(3) NOT NULL, `interval` VARCHAR(10) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
  UNIQUE INDEX `BillingPrice_mode_catalogRevision_priceKey_key` (`mode`, `catalogRevision`, `priceKey`),
  UNIQUE INDEX `BillingPrice_mode_stripePriceId_key` (`mode`, `stripePriceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BillingSubscription` (
  `id` VARCHAR(255) NOT NULL, `customerId` VARCHAR(64) NOT NULL, `mode` VARCHAR(10) NOT NULL,
  `stripePriceId` VARCHAR(255) NOT NULL, `status` VARCHAR(30) NOT NULL,
  `recognized` BOOLEAN NOT NULL DEFAULT false, `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
  `periodEnd` DATETIME(3) NULL, `paidThrough` DATETIME(3) NULL,
  `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
  INDEX `BillingSubscription_customerId_mode_idx` (`customerId`, `mode`),
  CONSTRAINT `BillingSubscription_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `BillingCustomer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BillingEvent` (
  `id` VARCHAR(255) NOT NULL, `mode` VARCHAR(10) NOT NULL, `type` VARCHAR(100) NOT NULL,
  `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
