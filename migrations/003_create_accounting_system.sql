-- Migration: Complete Accounting System for Library
-- Created: 2025-11-20
-- Description: Full accounting system with categories, accounts, transactions, and daily cash reconciliation

-- Create separate database for accounting
CREATE DATABASE IF NOT EXISTS `accounting` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE accounting;

-- ============================================================================
-- 1. EXPENSE CATEGORIES (Categorías de Egresos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `expense_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `parent_id` INT NULL,
  `color` VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  `budget` DECIMAL(15, 2) NULL,
  `is_featured` BOOLEAN DEFAULT FALSE,
  `order_index` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`parent_id`) REFERENCES `expense_categories`(`id`) ON DELETE CASCADE,
  INDEX idx_parent_id (`parent_id`),
  INDEX idx_order_index (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. INCOME CATEGORIES (Categorías de Ingresos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `income_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `parent_id` INT NULL,
  `color` VARCHAR(7) NOT NULL DEFAULT '#10B981',
  `budget` DECIMAL(15, 2) NULL,
  `is_featured` BOOLEAN DEFAULT FALSE,
  `order_index` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`parent_id`) REFERENCES `income_categories`(`id`) ON DELETE CASCADE,
  INDEX idx_parent_id (`parent_id`),
  INDEX idx_order_index (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. TRANSFER TYPES (Tipos de Transferencias)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `transfer_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `color` VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  `description` TEXT NULL,
  `order_index` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_index (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. ACCOUNTS (Cuentas - Caja y Bancos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `accounts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('cash', 'bank', 'other') NOT NULL DEFAULT 'bank',
  `account_number` VARCHAR(50) NULL,
  `bank_name` VARCHAR(100) NULL,
  `currency` VARCHAR(3) DEFAULT 'ARS',
  `initial_balance` DECIMAL(15, 2) DEFAULT 0.00,
  `current_balance` DECIMAL(15, 2) DEFAULT 0.00,
  `is_active` BOOLEAN DEFAULT TRUE,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (`type`),
  INDEX idx_is_active (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. EXPENSES (Egresos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `amount` DECIMAL(15, 2) NOT NULL,
  `category_id` INT NULL,
  `account_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `description` TEXT,
  `attachment_url` VARCHAR(500) NULL,
  `user_id` INT NOT NULL COMMENT 'References abr.usuarios.id',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT,
  INDEX idx_category_id (`category_id`),
  INDEX idx_account_id (`account_id`),
  INDEX idx_date (`date`),
  INDEX idx_user_id (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. INCOMES (Ingresos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `incomes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `amount` DECIMAL(15, 2) NOT NULL,
  `category_id` INT NULL,
  `account_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `description` TEXT,
  `attachment_url` VARCHAR(500) NULL,
  `user_id` INT NOT NULL COMMENT 'References abr.usuarios.id',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `income_categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT,
  INDEX idx_category_id (`category_id`),
  INDEX idx_account_id (`account_id`),
  INDEX idx_date (`date`),
  INDEX idx_user_id (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. TRANSFERS (Transferencias entre cuentas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `transfers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `amount` DECIMAL(15, 2) NOT NULL,
  `from_account_id` INT NOT NULL,
  `to_account_id` INT NOT NULL,
  `transfer_type_id` INT NULL,
  `date` DATE NOT NULL,
  `description` TEXT,
  `user_id` INT NOT NULL COMMENT 'References abr.usuarios.id',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`from_account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`transfer_type_id`) REFERENCES `transfer_types`(`id`) ON DELETE SET NULL,
  INDEX idx_from_account (`from_account_id`),
  INDEX idx_to_account (`to_account_id`),
  INDEX idx_date (`date`),
  INDEX idx_user_id (`user_id`),
  CONSTRAINT chk_different_accounts CHECK (`from_account_id` != `to_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. DAILY CASH RECONCILIATIONS (Arqueos de Caja Diarios)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `cash_reconciliations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `account_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `opening_balance` DECIMAL(15, 2) NOT NULL,
  `closing_balance` DECIMAL(15, 2) NOT NULL,
  `expected_balance` DECIMAL(15, 2) NOT NULL,
  `difference` DECIMAL(15, 2) GENERATED ALWAYS AS (`closing_balance` - `expected_balance`) STORED,
  `notes` TEXT NULL,
  `user_id` INT NOT NULL COMMENT 'References abr.usuarios.id',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT,
  UNIQUE KEY `unique_account_date` (`account_id`, `date`),
  INDEX idx_date (`date`),
  INDEX idx_account_id (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT DEFAULT DATA
-- ============================================================================

-- Default Expense Categories
INSERT INTO `expense_categories` (`name`, `parent_id`, `color`, `order_index`) VALUES
-- Root categories
('Home', NULL, '#86efac', 1),
('Shopping', NULL, '#fca5a5', 5),
('Fun', NULL, '#fcd34d', 9),
('Car', NULL, '#d1d5db', 13),
-- Home subcategories
('Rent / Mortgage', 1, '#15803d', 2),
('Utilities', 1, '#16a34a', 3),
('Phone & Internet', 1, '#22c55e', 4),
-- Shopping subcategories
('Groceries', 5, '#dc2626', 6),
('Cleaning', 5, '#ef4444', 7),
('Clothing', 5, '#f87171', 8),
-- Fun subcategories
('Restaurant', 9, '#ca8a04', 10),
('Streaming', 9, '#eab308', 11),
('Sport', 9, '#facc15', 12),
-- Car subcategories
('Fuel', 13, '#6b7280', 14),
('Insurance', 13, '#9ca3af', 15),
('Tolls', 13, '#d1d5db', 16);

-- Default Income Categories
INSERT INTO `income_categories` (`name`, `parent_id`, `color`, `order_index`) VALUES
-- Root categories
('Membership Fees', NULL, '#10b981', 1),
('Services', NULL, '#3b82f6', 4),
('Donations', NULL, '#8b5cf6', 7),
-- Membership subcategories
('Monthly Fees', 1, '#059669', 2),
('Annual Fees', 1, '#047857', 3),
-- Services subcategories
('Photocopies', 4, '#2563eb', 5),
('Book Sales', 4, '#1d4ed8', 6),
-- Donations subcategories
('Individual Donations', 7, '#7c3aed', 8),
('Corporate Donations', 7, '#6d28d9', 9);

-- Default Transfer Types
INSERT INTO `transfer_types` (`name`, `color`, `description`, `order_index`) VALUES
('Bank Deposit', '#3b82f6', 'Deposit from cash to bank account', 1),
('Bank Withdrawal', '#ef4444', 'Withdrawal from bank to cash', 2),
('Inter-bank Transfer', '#8b5cf6', 'Transfer between bank accounts', 3),
('Cash Movement', '#f59e0b', 'Internal cash movement', 4);

-- Default Accounts
INSERT INTO `accounts` (`name`, `type`, `account_number`, `bank_name`, `initial_balance`, `current_balance`) VALUES
('Caja Principal', 'cash', NULL, NULL, 0.00, 0.00),
('Banco Nación', 'bank', '1234567890', 'Banco de la Nación Argentina', 0.00, 0.00),
('Banco Provincia', 'bank', '0987654321', 'Banco Provincia', 0.00, 0.00);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Accounting system created successfully!' AS status;
SELECT 'Tables created:' AS info;
SHOW TABLES LIKE '%expense%';
SHOW TABLES LIKE '%income%';
SHOW TABLES LIKE '%transfer%';
SHOW TABLES LIKE '%account%';
SHOW TABLES LIKE '%cash%';
