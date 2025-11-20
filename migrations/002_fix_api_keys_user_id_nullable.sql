-- Migration: Make user_id nullable in api_keys table
-- This allows creating system-level API keys not tied to a specific user
-- Created: 2025-11-20

USE abr;

-- Modify user_id to allow NULL values
ALTER TABLE `api_keys`
MODIFY COLUMN `user_id` INT NULL;

-- Verify the change
DESCRIBE `api_keys`;
