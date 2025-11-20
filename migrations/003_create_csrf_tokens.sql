-- Migration: Create CSRF tokens table
-- Date: 2025-11-06
-- Description: Create proper table for storing and validating CSRF tokens

-- Drop old app table if it exists (was never properly used)
DROP TABLE IF EXISTS app;

-- Create dedicated CSRF tokens table
CREATE TABLE IF NOT EXISTS csrf_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(128) NOT NULL UNIQUE,
  user_id INT NULL COMMENT 'Optional: associate token with user for extra security',
  ip_address VARCHAR(45) NULL COMMENT 'Optional: associate token with IP for extra security',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE COMMENT 'Track if token has been used (single-use tokens)',
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create cleanup event to remove expired tokens automatically
-- This runs daily at 3 AM to clean up old tokens
DROP EVENT IF EXISTS cleanup_expired_csrf_tokens;

CREATE EVENT cleanup_expired_csrf_tokens
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 3 HOUR)
DO
  DELETE FROM csrf_tokens WHERE expires_at < NOW() OR (used = TRUE AND created_at < NOW() - INTERVAL 1 HOUR);

-- Note: To apply this migration:
-- docker exec -it mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < migrations/003_create_csrf_tokens.sql
