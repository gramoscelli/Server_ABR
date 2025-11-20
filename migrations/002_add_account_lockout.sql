-- Migration: Add account lockout fields
-- Date: 2025-11-06
-- Description: Add fields to track failed login attempts and account lockout

-- Add columns to usuarios table for account lockout
ALTER TABLE usuarios
ADD COLUMN failed_attempts INT DEFAULT 0 COMMENT 'Number of consecutive failed login attempts',
ADD COLUMN locked_until TIMESTAMP NULL COMMENT 'Account locked until this timestamp',
ADD COLUMN last_failed_attempt TIMESTAMP NULL COMMENT 'Timestamp of last failed login attempt',
ADD INDEX idx_locked_until (locked_until);

-- Note: To apply this migration:
-- docker exec -it mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < migrations/002_add_account_lockout.sql
