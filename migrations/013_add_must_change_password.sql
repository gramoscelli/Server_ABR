-- Migration: Add missing columns to usuarios table
-- Date: 2025-11-22
-- Description: Add all columns required by the User model

USE abr;

-- Add nombre column
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='abr' AND TABLE_NAME='usuarios' AND COLUMN_NAME='nombre') = 0,
    'ALTER TABLE usuarios ADD COLUMN nombre VARCHAR(100) NULL',
    'SELECT "nombre exists" as info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add apellido column
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='abr' AND TABLE_NAME='usuarios' AND COLUMN_NAME='apellido') = 0,
    'ALTER TABLE usuarios ADD COLUMN apellido VARCHAR(100) NULL',
    'SELECT "apellido exists" as info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add must_change_password column
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='abr' AND TABLE_NAME='usuarios' AND COLUMN_NAME='must_change_password') = 0,
    'ALTER TABLE usuarios ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE',
    'SELECT "must_change_password exists" as info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add is_active column
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='abr' AND TABLE_NAME='usuarios' AND COLUMN_NAME='is_active') = 0,
    'ALTER TABLE usuarios ADD COLUMN is_active BOOLEAN DEFAULT TRUE',
    'SELECT "is_active exists" as info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add last_failed_attempt column
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='abr' AND TABLE_NAME='usuarios' AND COLUMN_NAME='last_failed_attempt') = 0,
    'ALTER TABLE usuarios ADD COLUMN last_failed_attempt TIMESTAMP NULL',
    'SELECT "last_failed_attempt exists" as info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Copy data from 'active' to 'is_active' if both exist
UPDATE usuarios SET is_active = active WHERE is_active IS NULL;

-- Set root to require password change
UPDATE usuarios SET must_change_password = TRUE WHERE username = 'root';

SELECT 'Migration 013: All missing columns added to usuarios' as status;
