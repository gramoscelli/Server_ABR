-- Migration: Add must_change_password column to usuarios
-- Date: 2025-11-22
-- Description: Add column for forcing password change on first login

USE abr;

-- Add must_change_password column
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE COMMENT 'Force password change on next login';

-- Set default root user to require password change
UPDATE usuarios SET must_change_password = TRUE WHERE username = 'root' AND must_change_password IS NULL;

SELECT 'Migration 013: must_change_password column added' as status;
