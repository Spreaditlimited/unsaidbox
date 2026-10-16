-- Additive only; does not change existing accounts, messages or subscriptions.
CREATE TABLE `BillingConfiguration` (
  `id` VARCHAR(30) NOT NULL,
  `prices` JSON NOT NULL,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `updatedBy` VARCHAR(30) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `BillingConfiguration` (`id`, `prices`, `updatedAt`)
VALUES ('pricing', '{"gbpMonthly":900,"gbpAnnual":9000,"usdMonthly":1200,"usdAnnual":12000}', CURRENT_TIMESTAMP(3));
