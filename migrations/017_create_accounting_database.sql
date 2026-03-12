-- Migration: Create accounting database and all accounting tables
-- Database: accounting (separate from main 'abr' database)
-- Created: 2026-03-06
-- Description: Complete schema for the accounting system including:
--   - Chart of accounts (plan_de_cuentas)
--   - Financial accounts, expenses, incomes, transfers
--   - Categories (expense, income, transfer types)
--   - Cash reconciliations
--   - Suppliers and supplier categories
--   - Purchase system (requests, quotations, orders)
--   - Purchase settings

-- Create the accounting database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `accounting`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `accounting`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- CHART OF ACCOUNTS
-- ============================================================

CREATE TABLE IF NOT EXISTS `plan_de_cuentas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` int NOT NULL COMMENT 'e.g., 1101, 4101, 5501',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Account name (e.g., CAJA, CUOTAS SOCIALES)',
  `tipo` enum('activo','pasivo','ingreso','egreso') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '1=activo,2=pasivo,4=ingreso,5=egreso',
  `grupo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Group prefix (11, 12, 41, 51, etc.)',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS `expense_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` int DEFAULT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#6B7280',
  `budget` decimal(15,2) DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT '0',
  `order_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_order_index` (`order_index`),
  CONSTRAINT `expense_categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `expense_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `income_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` int DEFAULT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#10B981',
  `budget` decimal(15,2) DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT '0',
  `order_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_order_index` (`order_index`),
  CONSTRAINT `income_categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `income_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transfer_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#3B82F6',
  `description` text COLLATE utf8mb4_unicode_ci,
  `order_index` int DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_index` (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FINANCIAL ACCOUNTS
-- ============================================================

CREATE TABLE IF NOT EXISTS `accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('cash','bank','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bank',
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'ARS',
  `initial_balance` decimal(15,2) DEFAULT '0.00',
  `current_balance` decimal(15,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `plan_cta_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_accounts_plan_cta_id` (`plan_cta_id`),
  CONSTRAINT `fk_accounts_plan_cta` FOREIGN KEY (`plan_cta_id`) REFERENCES `plan_de_cuentas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- EXPENSES, INCOMES, TRANSFERS
-- ============================================================

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `amount` decimal(15,2) NOT NULL,
  `category_id` int DEFAULT NULL,
  `plan_cta_id` int DEFAULT NULL,
  `account_id` int NOT NULL,
  `date` date NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `attachment_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` int NOT NULL COMMENT 'References abr.usuarios.id',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `purchase_order_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_account_id` (`account_id`),
  KEY `idx_date` (`date`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_purchase_order_id` (`purchase_order_id`),
  KEY `idx_expenses_plan_cta_id` (`plan_cta_id`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_expenses_plan_cta` FOREIGN KEY (`plan_cta_id`) REFERENCES `plan_de_cuentas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `incomes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `amount` decimal(15,2) NOT NULL,
  `category_id` int DEFAULT NULL,
  `plan_cta_id` int DEFAULT NULL,
  `account_id` int NOT NULL,
  `date` date NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `attachment_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` int NOT NULL COMMENT 'References abr.usuarios.id',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_account_id` (`account_id`),
  KEY `idx_date` (`date`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_incomes_plan_cta_id` (`plan_cta_id`),
  CONSTRAINT `fk_incomes_plan_cta` FOREIGN KEY (`plan_cta_id`) REFERENCES `plan_de_cuentas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `incomes_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `income_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `incomes_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transfers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `amount` decimal(15,2) NOT NULL,
  `from_account_id` int NOT NULL,
  `to_account_id` int NOT NULL,
  `transfer_type_id` int DEFAULT NULL,
  `date` date NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `user_id` int NOT NULL COMMENT 'References abr.usuarios.id',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `transfer_type_id` (`transfer_type_id`),
  KEY `idx_from_account` (`from_account_id`),
  KEY `idx_to_account` (`to_account_id`),
  KEY `idx_date` (`date`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `transfers_ibfk_1` FOREIGN KEY (`from_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `transfers_ibfk_2` FOREIGN KEY (`to_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `transfers_ibfk_3` FOREIGN KEY (`transfer_type_id`) REFERENCES `transfer_types` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_different_accounts` CHECK ((`from_account_id` <> `to_account_id`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CASH RECONCILIATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS `cash_reconciliations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_id` int NOT NULL,
  `date` date NOT NULL,
  `opening_balance` decimal(15,2) NOT NULL,
  `closing_balance` decimal(15,2) NOT NULL,
  `expected_balance` decimal(15,2) NOT NULL,
  `difference` decimal(15,2) GENERATED ALWAYS AS ((`closing_balance` - `expected_balance`)) STORED,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `user_id` int NOT NULL COMMENT 'References abr.usuarios.id',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_account_date` (`account_id`,`date`),
  KEY `idx_date` (`date`),
  KEY `idx_account_id` (`account_id`),
  CONSTRAINT `cash_reconciliations_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SUPPLIERS
-- ============================================================

CREATE TABLE IF NOT EXISTS `supplier_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#6B7280',
  `order_index` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_index` (`order_index`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trade_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nombre de fantasia',
  `cuit` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'CUIT format: XX-XXXXXXXX-X',
  `tax_condition` enum('responsable_inscripto','monotributista','exento','consumidor_final','otro') COLLATE utf8mb4_unicode_ci DEFAULT 'responsable_inscripto',
  `category_id` int DEFAULT NULL,
  `contact_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `province` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_type` enum('caja_ahorro','cuenta_corriente') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_cbu` varchar(22) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_alias` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_terms` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `rating` tinyint unsigned DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cuit` (`cuit`),
  KEY `idx_business_name` (`business_name`),
  KEY `idx_cuit` (`cuit`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `suppliers_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `supplier_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PURCHASE SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS `purchase_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` int DEFAULT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#6B7280',
  `expense_category_id` int DEFAULT NULL,
  `order_index` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `expense_category_id` (`expense_category_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_order_index` (`order_index`),
  CONSTRAINT `purchase_categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `purchase_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_categories_ibfk_2` FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `justification` text COLLATE utf8mb4_unicode_ci,
  `category_id` int DEFAULT NULL,
  `estimated_amount` decimal(15,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'ARS',
  `purchase_type` enum('direct','price_competition','tender') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'direct',
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `status` enum('draft','pending_approval','approved','rejected','in_quotation','quotation_received','in_evaluation','order_created','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `preferred_supplier_id` int DEFAULT NULL,
  `required_date` date DEFAULT NULL,
  `attachment_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_number` (`request_number`),
  KEY `category_id` (`category_id`),
  KEY `preferred_supplier_id` (`preferred_supplier_id`),
  KEY `idx_request_number` (`request_number`),
  KEY `idx_status` (`status`),
  KEY `idx_purchase_type` (`purchase_type`),
  KEY `idx_requested_by` (`requested_by`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `purchase_requests_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `purchase_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_requests_ibfk_2` FOREIGN KEY (`preferred_supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_request_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'unidad',
  `estimated_unit_price` decimal(15,2) DEFAULT NULL,
  `specifications` text COLLATE utf8mb4_unicode_ci,
  `order_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_request_id` (`request_id`),
  CONSTRAINT `purchase_request_items_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_request_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_request_id` int NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `comments` text COLLATE utf8mb4_unicode_ci,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_purchase_request_id` (`purchase_request_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `purchase_request_history_ibfk_1` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- QUOTATION SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS `quotation_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfq_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_request_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `specifications` text COLLATE utf8mb4_unicode_ci,
  `deadline` date NOT NULL,
  `status` enum('open','closed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfq_number` (`rfq_number`),
  KEY `idx_rfq_number` (`rfq_number`),
  KEY `idx_purchase_request_id` (`purchase_request_id`),
  KEY `idx_status` (`status`),
  KEY `idx_deadline` (`deadline`),
  CONSTRAINT `quotation_requests_ibfk_1` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rfq_suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_request_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `invited_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notified` tinyint(1) DEFAULT '0',
  `notified_at` datetime DEFAULT NULL,
  `responded` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rfq_supplier` (`quotation_request_id`,`supplier_id`),
  KEY `idx_quotation_request_id` (`quotation_request_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  CONSTRAINT `rfq_suppliers_ibfk_1` FOREIGN KEY (`quotation_request_id`) REFERENCES `quotation_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rfq_suppliers_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quotation_request_id` int DEFAULT NULL,
  `purchase_request_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'ARS',
  `payment_terms` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivery_time` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `status` enum('received','under_review','selected','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'received',
  `is_selected` tinyint(1) DEFAULT '0',
  `selection_reason` text COLLATE utf8mb4_unicode_ci,
  `attachment_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `received_by` int NOT NULL,
  `received_at` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quotation_request_id` (`quotation_request_id`),
  KEY `idx_purchase_request_id` (`purchase_request_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_is_selected` (`is_selected`),
  CONSTRAINT `quotations_ibfk_1` FOREIGN KEY (`quotation_request_id`) REFERENCES `quotation_requests` (`id`) ON DELETE SET NULL,
  CONSTRAINT `quotations_ibfk_2` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quotations_ibfk_3` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quotation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_id` int NOT NULL,
  `request_item_id` int DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'unidad',
  `unit_price` decimal(15,2) NOT NULL,
  `total_price` decimal(15,2) GENERATED ALWAYS AS ((`quantity` * `unit_price`)) STORED,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `order_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `request_item_id` (`request_item_id`),
  KEY `idx_quotation_id` (`quotation_id`),
  CONSTRAINT `quotation_items_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quotation_items_ibfk_2` FOREIGN KEY (`request_item_id`) REFERENCES `purchase_request_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_request_id` int NOT NULL,
  `quotation_id` int DEFAULT NULL,
  `supplier_id` int NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'ARS',
  `payment_terms` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','sent','confirmed','partially_received','received','invoiced','paid','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `expected_delivery_date` date DEFAULT NULL,
  `actual_delivery_date` date DEFAULT NULL,
  `delivery_address` text COLLATE utf8mb4_unicode_ci,
  `delivery_notes` text COLLATE utf8mb4_unicode_ci,
  `account_id` int DEFAULT NULL,
  `expense_id` int DEFAULT NULL,
  `invoice_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `invoice_attachment_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `quotation_id` (`quotation_id`),
  KEY `account_id` (`account_id`),
  KEY `expense_id` (`expense_id`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_purchase_request_id` (`purchase_request_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_orders_ibfk_3` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `purchase_orders_ibfk_4` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_orders_ibfk_5` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `quotation_item_id` int DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'unidad',
  `unit_price` decimal(15,2) NOT NULL,
  `total_price` decimal(15,2) GENERATED ALWAYS AS ((`quantity` * `unit_price`)) STORED,
  `received_quantity` decimal(10,2) DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `order_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `quotation_item_id` (`quotation_item_id`),
  KEY `idx_order_id` (`order_id`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`quotation_item_id`) REFERENCES `quotation_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
