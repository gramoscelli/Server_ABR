-- Migration: Create authentication tables
-- Date: 2025-11-06
-- Description: Add users, API keys, and refresh tokens tables for JWT authentication

-- Users table
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  role ENUM('admin', 'user', 'readonly') DEFAULT 'user',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_username (username),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API keys table for service-to-service authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  user_id INT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  last_used TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_key_hash (key_hash),
  INDEX idx_active (active),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh tokens table for long-lived sessions
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: No default admin user is created for security reasons.
-- To create your first admin user, run the following command after applying this migration:
--
-- docker exec -it nodejs node -e "
--   const bcrypt = require('bcryptjs');
--   const hash = bcrypt.hashSync('YOUR_SECURE_PASSWORD', 10);
--   console.log('Password hash:', hash);
-- "
--
-- Then insert manually:
-- INSERT INTO usuarios (username, password_hash, email, role, active)
-- VALUES ('admin', 'PASTE_HASH_HERE', 'admin@yourdomain.com', 'admin', true);
--
-- Or use the setup script: node scripts/create_admin.js

-- Note: To apply this migration:
-- docker exec -it mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < migrations/001_create_auth_tables.sql
