-- Sequelize Authentication Tables Migration
-- Run this to create the tables required by Sequelize models

-- Create usuarios table (if not exists)
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `email` VARCHAR(100) UNIQUE,
  `role` VARCHAR(20) DEFAULT 'user',
  `failed_attempts` INT DEFAULT 0,
  `locked_until` DATETIME,
  `is_active` BOOLEAN DEFAULT TRUE,
  `last_login` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create api_keys table
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `api_key` VARCHAR(64) UNIQUE NOT NULL,
  `name` VARCHAR(100),
  `is_active` BOOLEAN DEFAULT TRUE,
  `last_used` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME,
  FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token` VARCHAR(255) UNIQUE NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create csrf_tokens table
CREATE TABLE IF NOT EXISTS `csrf_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `token` VARCHAR(64) UNIQUE NOT NULL,
  `user_id` INT,
  `ip_address` VARCHAR(45),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  `used` BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance (ignore errors if already exist)
CREATE INDEX `idx_username` ON `usuarios`(`username`);
CREATE INDEX `idx_email` ON `usuarios`(`email`);
CREATE INDEX `idx_api_key` ON `api_keys`(`api_key`);
CREATE INDEX `idx_user_id` ON `api_keys`(`user_id`);
CREATE INDEX `idx_refresh_token` ON `refresh_tokens`(`token`);
CREATE INDEX `idx_csrf_token` ON `csrf_tokens`(`token`);
CREATE INDEX `idx_csrf_expires` ON `csrf_tokens`(`expires_at`);
