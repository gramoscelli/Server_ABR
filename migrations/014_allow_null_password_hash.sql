-- Migration: Allow NULL password_hash for OAuth users
-- Date: 2025-11-22
-- Description: OAuth users don't have passwords

USE abr;

-- Modify password_hash to allow NULL
ALTER TABLE usuarios MODIFY COLUMN password_hash VARCHAR(255) NULL;

SELECT 'Migration 014: password_hash now allows NULL for OAuth users' as status;
