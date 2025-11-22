-- Migration: Add must_change_password column to usuarios
-- Date: 2025-11-22
-- Description: Add column for forcing password change on first login

USE abr;

-- Add must_change_password column (ignore error if already exists)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = 'abr' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'must_change_password') = 0,
    'ALTER TABLE usuarios ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE',
    'SELECT "Column already exists" as info'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Set default root user to require password change
UPDATE usuarios SET must_change_password = TRUE WHERE username = 'root';

SELECT 'Migration 013: must_change_password column added' as status;
