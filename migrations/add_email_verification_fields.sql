-- Migration: Add email verification fields to usuarios table
-- Date: 2025-01-11

-- Add email_verification_token column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = 'usuarios'
    AND table_schema = DATABASE()
    AND column_name = 'email_verification_token'
  ) > 0,
  "SELECT 'Column email_verification_token already exists' AS Info",
  "ALTER TABLE usuarios ADD COLUMN email_verification_token VARCHAR(255) NULL COMMENT 'Token for email verification'"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add email_verification_expires column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = 'usuarios'
    AND table_schema = DATABASE()
    AND column_name = 'email_verification_expires'
  ) > 0,
  "SELECT 'Column email_verification_expires already exists' AS Info",
  "ALTER TABLE usuarios ADD COLUMN email_verification_expires DATETIME NULL COMMENT 'Expiration date for email verification token'"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for faster token lookups if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_name = 'usuarios'
    AND table_schema = DATABASE()
    AND index_name = 'idx_email_verification_token'
  ) > 0,
  "SELECT 'Index idx_email_verification_token already exists' AS Info",
  "CREATE INDEX idx_email_verification_token ON usuarios(email_verification_token)"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
