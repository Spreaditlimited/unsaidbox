-- Additive migration. Preserve existing image bytes for rollback compatibility.
ALTER TABLE `BlogImage`
  ADD COLUMN `cloudinaryPublicId` VARCHAR(255) NULL,
  ADD COLUMN `cloudinaryUrl` VARCHAR(1000) NULL;
