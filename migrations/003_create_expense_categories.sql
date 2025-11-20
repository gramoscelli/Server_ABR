-- Migration: Create expense categories table
-- Created: 2025-11-20

USE abr;

-- Create expense_categories table
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

-- Create expenses table
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `amount` DECIMAL(15, 2) NOT NULL,
  `category_id` INT NULL,
  `from_account` VARCHAR(50) NOT NULL DEFAULT 'cash',
  `date` DATE NOT NULL,
  `description` TEXT,
  `attachment_url` VARCHAR(500) NULL,
  `user_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  INDEX idx_category_id (`category_id`),
  INDEX idx_date (`date`),
  INDEX idx_user_id (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default expense categories
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

-- Verify the structure
SELECT 'Expense categories table created successfully' AS status;
DESCRIBE `expense_categories`;
DESCRIBE `expenses`;
