-- Migration: Add OAuth2 support
-- Date: 2025-11-07
-- Description: Adds oauth_providers table and updates usuarios table for OAuth authentication

USE abr;

-- Step 1: Create oauth_providers table
CREATE TABLE IF NOT EXISTS oauth_providers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    provider VARCHAR(50) NOT NULL COMMENT 'OAuth provider name (google, github, etc.)',
    provider_user_id VARCHAR(255) NOT NULL COMMENT 'User ID from OAuth provider',
    provider_email VARCHAR(255) DEFAULT NULL COMMENT 'Email from OAuth provider',
    provider_username VARCHAR(255) DEFAULT NULL COMMENT 'Username from OAuth provider',
    access_token TEXT DEFAULT NULL COMMENT 'OAuth access token (encrypted)',
    refresh_token TEXT DEFAULT NULL COMMENT 'OAuth refresh token (encrypted)',
    token_expires_at DATETIME DEFAULT NULL COMMENT 'When the access token expires',
    profile_data JSON DEFAULT NULL COMMENT 'Additional profile data from provider',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_provider (provider),
    INDEX idx_provider_user_id (provider_user_id),
    UNIQUE KEY unique_provider_user (provider, provider_user_id),

    -- Foreign key
    CONSTRAINT fk_oauth_user
        FOREIGN KEY (user_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='OAuth provider connections for users';

-- Step 2: Add OAuth-related columns to usuarios table (only if they don't exist)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'abr' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'oauth_only');
SET @sql_add_oauth_only = IF(@col_exists = 0,
    'ALTER TABLE usuarios ADD COLUMN oauth_only BOOLEAN DEFAULT FALSE COMMENT ''True if user only uses OAuth (no password)''',
    'SELECT ''Column oauth_only already exists'' AS msg');
PREPARE stmt FROM @sql_add_oauth_only;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'abr' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email_verified');
SET @sql_add_email_verified = IF(@col_exists = 0,
    'ALTER TABLE usuarios ADD COLUMN email_verified BOOLEAN DEFAULT FALSE COMMENT ''Email verification status''',
    'SELECT ''Column email_verified already exists'' AS msg');
PREPARE stmt FROM @sql_add_email_verified;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'abr' AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'avatar_url');
SET @sql_add_avatar_url = IF(@col_exists = 0,
    'ALTER TABLE usuarios ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL COMMENT ''User avatar URL from OAuth provider''',
    'SELECT ''Column avatar_url already exists'' AS msg');
PREPARE stmt FROM @sql_add_avatar_url;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Update existing users to have verified emails and password-based auth
UPDATE usuarios SET oauth_only = FALSE, email_verified = TRUE WHERE password_hash IS NOT NULL;

-- Step 4: Create indexes for new columns (if they don't exist)
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = 'abr' AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'idx_oauth_only');
SET @sql_idx_oauth = IF(@idx_exists = 0,
    'CREATE INDEX idx_oauth_only ON usuarios(oauth_only)',
    'SELECT ''Index idx_oauth_only already exists'' AS msg');
PREPARE stmt FROM @sql_idx_oauth;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = 'abr' AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'idx_email_verified');
SET @sql_idx_email = IF(@idx_exists = 0,
    'CREATE INDEX idx_email_verified ON usuarios(email_verified)',
    'SELECT ''Index idx_email_verified already exists'' AS msg');
PREPARE stmt FROM @sql_idx_email;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migration complete
SELECT 'Migration 004: OAuth support added successfully' as status;
SELECT COUNT(*) as oauth_providers_count FROM oauth_providers;
