-- Migration: Complete Purchases System
-- Created: 2025-11-23
-- Description: Full purchasing system with suppliers, requests, quotations, orders, and approval workflow

-- ============================================================================
-- PART 1: ADD BOARD_MEMBER ROLE AND PURCHASE RESOURCES (in abr database)
-- ============================================================================
USE abr;

-- Add board_member role (between root and admin_employee in hierarchy)
INSERT INTO roles (name, description) VALUES
    ('board_member', 'Miembro de la Junta Directiva - aprueba compras y decisiones administrativas')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Add purchase-related resources
INSERT INTO resources (name, description) VALUES
    ('suppliers', 'Supplier/vendor management'),
    ('purchase_requests', 'Purchase request creation and management'),
    ('purchase_approvals', 'Purchase request approval workflow'),
    ('purchase_orders', 'Purchase order management'),
    ('purchase_settings', 'Purchase module configuration'),
    ('purchase_reports', 'Purchase reports and statistics')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Grant permissions to board_member role
-- board_member can: approve purchases, view everything, manage suppliers
INSERT INTO role_permissions (role_id, resource_id, actions)
SELECT
    (SELECT id FROM roles WHERE name = 'board_member') as role_id,
    r.id as resource_id,
    CASE r.name
        WHEN 'purchase_approvals' THEN JSON_ARRAY('read', 'create', 'update')
        WHEN 'suppliers' THEN JSON_ARRAY('read', 'create', 'update', 'delete')
        WHEN 'purchase_requests' THEN JSON_ARRAY('read', 'create', 'update')
        WHEN 'purchase_orders' THEN JSON_ARRAY('read', 'create', 'update')
        WHEN 'purchase_reports' THEN JSON_ARRAY('read')
        WHEN 'purchase_settings' THEN JSON_ARRAY('read', 'update')
        ELSE JSON_ARRAY('read')
    END as actions
FROM resources r
WHERE r.name IN ('suppliers', 'purchase_requests', 'purchase_approvals', 'purchase_orders', 'purchase_reports', 'purchase_settings')
ON DUPLICATE KEY UPDATE actions = VALUES(actions);

-- Grant permissions to admin_employee role (can create requests, view, but not approve)
INSERT INTO role_permissions (role_id, resource_id, actions)
SELECT
    (SELECT id FROM roles WHERE name = 'admin_employee') as role_id,
    r.id as resource_id,
    CASE r.name
        WHEN 'suppliers' THEN JSON_ARRAY('read', 'create', 'update')
        WHEN 'purchase_requests' THEN JSON_ARRAY('read', 'create', 'update')
        WHEN 'purchase_orders' THEN JSON_ARRAY('read', 'create', 'update')
        WHEN 'purchase_reports' THEN JSON_ARRAY('read')
        ELSE JSON_ARRAY('read')
    END as actions
FROM resources r
WHERE r.name IN ('suppliers', 'purchase_requests', 'purchase_orders', 'purchase_reports')
ON DUPLICATE KEY UPDATE actions = VALUES(actions);

-- Grant permissions to library_employee role (can create requests only)
INSERT INTO role_permissions (role_id, resource_id, actions)
SELECT
    (SELECT id FROM roles WHERE name = 'library_employee') as role_id,
    r.id as resource_id,
    JSON_ARRAY('read', 'create') as actions
FROM resources r
WHERE r.name = 'purchase_requests'
ON DUPLICATE KEY UPDATE actions = VALUES(actions);

-- ============================================================================
-- PART 2: CREATE PURCHASE TABLES (in accounting database)
-- ============================================================================
USE accounting;

-- ============================================================================
-- 2.1 PURCHASE SETTINGS (Configuration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `purchase_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL UNIQUE,
    `setting_value` TEXT NOT NULL,
    `description` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO `purchase_settings` (`setting_key`, `setting_value`, `description`) VALUES
    ('direct_purchase_limit', '100000', 'Monto máximo para compra directa sin concurso (en pesos)'),
    ('min_quotations_required', '3', 'Cantidad mínima de cotizaciones para concurso de precios'),
    ('quotation_validity_days', '30', 'Días de validez por defecto para cotizaciones'),
    ('require_board_approval_above', '50000', 'Monto a partir del cual se requiere aprobación de Junta Directiva')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ============================================================================
-- 2.2 SUPPLIER CATEGORIES (Rubros de proveedores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `supplier_categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `color` VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    `order_index` INT DEFAULT 0,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_index (`order_index`),
    INDEX idx_is_active (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default supplier categories
INSERT INTO `supplier_categories` (`name`, `description`, `color`, `order_index`) VALUES
    ('Librería y Papelería', 'Insumos de oficina, papel, útiles', '#3B82F6', 1),
    ('Tecnología', 'Equipos informáticos, software, servicios IT', '#8B5CF6', 2),
    ('Mantenimiento', 'Servicios de limpieza, reparaciones, mantenimiento edilicio', '#F59E0B', 3),
    ('Servicios Profesionales', 'Contadores, abogados, consultores', '#10B981', 4),
    ('Mobiliario', 'Muebles, estanterías, equipamiento', '#EF4444', 5),
    ('Servicios Generales', 'Electricidad, gas, agua, telecomunicaciones', '#6B7280', 6),
    ('Otros', 'Proveedores no categorizados', '#9CA3AF', 99);

-- ============================================================================
-- 2.3 SUPPLIERS (Proveedores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `suppliers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `business_name` VARCHAR(255) NOT NULL,
    `trade_name` VARCHAR(255) NULL COMMENT 'Nombre de fantasía',
    `cuit` VARCHAR(13) NULL UNIQUE COMMENT 'CUIT format: XX-XXXXXXXX-X',
    `tax_condition` ENUM('responsable_inscripto', 'monotributista', 'exento', 'consumidor_final', 'otro') DEFAULT 'responsable_inscripto',
    `category_id` INT NULL,
    `contact_name` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(50) NULL,
    `mobile` VARCHAR(50) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `province` VARCHAR(100) NULL,
    `postal_code` VARCHAR(20) NULL,
    `website` VARCHAR(255) NULL,
    `bank_name` VARCHAR(100) NULL,
    `bank_account_type` ENUM('caja_ahorro', 'cuenta_corriente') NULL,
    `bank_account_number` VARCHAR(50) NULL,
    `bank_cbu` VARCHAR(22) NULL,
    `bank_alias` VARCHAR(50) NULL,
    `payment_terms` VARCHAR(100) NULL COMMENT 'Condiciones de pago habituales',
    `notes` TEXT NULL,
    `rating` TINYINT UNSIGNED NULL COMMENT 'Rating 1-5',
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_by` INT NOT NULL COMMENT 'References abr.usuarios.id',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `supplier_categories`(`id`) ON DELETE SET NULL,
    INDEX idx_business_name (`business_name`),
    INDEX idx_cuit (`cuit`),
    INDEX idx_category_id (`category_id`),
    INDEX idx_is_active (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2.4 PURCHASE REQUEST CATEGORIES (Categorías de compras)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `purchase_categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `parent_id` INT NULL,
    `color` VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    `expense_category_id` INT NULL COMMENT 'Categoría de gasto asociada para contabilidad',
    `order_index` INT DEFAULT 0,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`parent_id`) REFERENCES `purchase_categories`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories`(`id`) ON DELETE SET NULL,
    INDEX idx_parent_id (`parent_id`),
    INDEX idx_order_index (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default purchase categories
INSERT INTO `purchase_categories` (`name`, `color`, `order_index`) VALUES
    ('Insumos de Oficina', '#3B82F6', 1),
    ('Equipamiento', '#8B5CF6', 2),
    ('Servicios', '#10B981', 3),
    ('Mantenimiento', '#F59E0B', 4),
    ('Libros y Material Bibliográfico', '#EF4444', 5),
    ('Otros', '#6B7280', 99);

-- ============================================================================
-- 2.5 PURCHASE REQUESTS (Solicitudes de Compra)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `purchase_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `request_number` VARCHAR(20) NOT NULL UNIQUE COMMENT 'SC-YYYY-NNNN format',
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `justification` TEXT NULL COMMENT 'Justificación de la necesidad',
    `category_id` INT NULL,
    `estimated_amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(3) DEFAULT 'ARS',
    `purchase_type` ENUM('direct', 'price_competition', 'tender') NOT NULL DEFAULT 'direct',
    `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    `status` ENUM(
        'draft',
        'pending_approval',
        'approved',
        'rejected',
        'in_quotation',
        'quotation_received',
        'in_evaluation',
        'order_created',
        'completed',
        'cancelled'
    ) DEFAULT 'draft',
    `preferred_supplier_id` INT NULL COMMENT 'Proveedor preferido (opcional)',
    `required_date` DATE NULL COMMENT 'Fecha requerida de entrega',
    `attachment_url` VARCHAR(500) NULL,
    `requested_by` INT NOT NULL COMMENT 'References abr.usuarios.id',
    `approved_by` INT NULL COMMENT 'References abr.usuarios.id',
    `approved_at` DATETIME NULL,
    `rejection_reason` TEXT NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `purchase_categories`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`preferred_supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL,
    INDEX idx_request_number (`request_number`),
    INDEX idx_status (`status`),
    INDEX idx_purchase_type (`purchase_type`),
    INDEX idx_requested_by (`requested_by`),
    INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2.6 PURCHASE REQUEST ITEMS (Items de Solicitud)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `purchase_request_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `request_id` INT NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unit` VARCHAR(50) DEFAULT 'unidad',
    `estimated_unit_price` DECIMAL(15, 2) NULL,
    `specifications` TEXT NULL,
    `order_index` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE,
    INDEX idx_request_id (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2.7 QUOTATION REQUESTS (Pedidos de Cotización / RFQ)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `quotation_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `rfq_number` VARCHAR(20) NOT NULL UNIQUE COMMENT 'RFQ-YYYY-NNNN format',
    `purchase_request_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `specifications` TEXT NULL,
    `deadline` DATE NOT NULL COMMENT 'Fecha límite para recibir cotizaciones',
    `status` ENUM('open', 'closed', 'cancelled') DEFAULT 'open',
    `notes` TEXT NULL,
    `created_by` INT NOT NULL COMMENT 'References abr.usuarios.id',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE,
    INDEX idx_rfq_number (`rfq_number`),
    INDEX idx_purchase_request_id (`purchase_request_id`),
    INDEX idx_status (`status`),
    INDEX idx_deadline (`deadline`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2.8 RFQ INVITED SUPPLIERS (Proveedores invitados a cotizar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `rfq_suppliers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quotation_request_id` INT NOT NULL,
    `supplier_id` INT NOT NULL,
    `invited_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `notified` BOOLEAN DEFAULT FALSE,
    `notified_at` DATETIME NULL,
    `responded` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`quotation_request_id`) REFERENCES `quotation_requests`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_rfq_supplier` (`quotation_request_id`, `supplier_id`),
    INDEX idx_quotation_request_id (`quotation_request_id`),
    INDEX idx_supplier_id (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2.9 QUOTATIONS (Cotizaciones recibidas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `quotations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quotation_number` VARCHAR(50) NULL COMMENT 'Número de presupuesto del proveedor',
    `quotation_request_id` INT NULL,
    `purchase_request_id` INT NOT NULL,
    `supplier_id` INT NOT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `tax_amount` DECIMAL(15, 2) DEFAULT 0,
    `total_amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(3) DEFAULT 'ARS',
    `payment_terms` VARCHAR(255) NULL COMMENT 'Condiciones de pago ofrecidas',
    `delivery_time` VARCHAR(100) NULL COMMENT 'Tiempo de entrega estimado',
    `valid_until` DATE NULL,
    `status` ENUM('received', 'under_review', 'selected', 'rejected') DEFAULT 'received',
    `is_selected` BOOLEAN DEFAULT FALSE,
    `selection_reason` TEXT NULL COMMENT 'Razón de selección/rechazo',
    `attachment_url` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `received_by` INT NOT NULL COMMENT 'References abr.usuarios.id',
    `received_at` DATE NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`quotation_request_id`) REFERENCES `quotation_requests`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT,
    INDEX idx_quotation_request_id (`quotation_request_id`),
    INDEX idx_purchase_request_id (`purchase_request_id`),
    INDEX idx_supplier_id (`supplier_id`),
    INDEX idx_status (`status`),
    INDEX idx_is_selected (`is_selected`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2.10 QUOTATION ITEMS (Items de cotización)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `quotation_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quotation_id` INT NOT NULL,
    `request_item_id` INT NULL COMMENT 'Referencia al item original de la solicitud',
    `description` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unit` VARCHAR(50) DEFAULT 'unidad',
    `unit_price` DECIMAL(15, 2) NOT NULL,
    `total_price` DECIMAL(15, 2) GENERATED ALWAYS AS (`quantity` * `unit_price`) STORED,
    `notes` TEXT NULL,
    `order_index` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`request_item_id`) REFERENCES `purchase_request_items`(`id`) ON DELETE SET NULL,
    INDEX idx_quotation_id (`quotation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2.11 PURCHASE ORDERS (Órdenes de Compra)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `purchase_orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_number` VARCHAR(20) NOT NULL UNIQUE COMMENT 'OC-YYYY-NNNN format',
    `purchase_request_id` INT NOT NULL,
    `quotation_id` INT NULL,
    `supplier_id` INT NOT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `tax_amount` DECIMAL(15, 2) DEFAULT 0,
    `total_amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(3) DEFAULT 'ARS',
    `payment_terms` VARCHAR(255) NULL,
    `status` ENUM(
        'draft',
        'sent',
        'confirmed',
        'partially_received',
        'received',
        'invoiced',
        'paid',
        'cancelled'
    ) DEFAULT 'draft',
    `expected_delivery_date` DATE NULL,
    `actual_delivery_date` DATE NULL,
    `delivery_address` TEXT NULL,
    `delivery_notes` TEXT NULL,
    `account_id` INT NULL COMMENT 'Cuenta contable para el pago',
    `expense_id` INT NULL COMMENT 'References accounting.expenses.id when invoiced',
    `invoice_number` VARCHAR(50) NULL,
    `invoice_date` DATE NULL,
    `invoice_attachment_url` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `created_by` INT NOT NULL COMMENT 'References abr.usuarios.id',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON DELETE SET NULL,
    INDEX idx_order_number (`order_number`),
    INDEX idx_purchase_request_id (`purchase_request_id`),
    INDEX idx_supplier_id (`supplier_id`),
    INDEX idx_status (`status`),
    INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2.12 PURCHASE ORDER ITEMS (Items de Orden de Compra)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `quotation_item_id` INT NULL,
    `description` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unit` VARCHAR(50) DEFAULT 'unidad',
    `unit_price` DECIMAL(15, 2) NOT NULL,
    `total_price` DECIMAL(15, 2) GENERATED ALWAYS AS (`quantity` * `unit_price`) STORED,
    `received_quantity` DECIMAL(10, 2) DEFAULT 0,
    `notes` TEXT NULL,
    `order_index` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`quotation_item_id`) REFERENCES `quotation_items`(`id`) ON DELETE SET NULL,
    INDEX idx_order_id (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2.13 PURCHASE REQUEST HISTORY (Historial de cambios de estado)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `purchase_request_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `purchase_request_id` INT NOT NULL,
    `action` VARCHAR(50) NOT NULL COMMENT 'created, submitted, approved, rejected, etc.',
    `from_status` VARCHAR(50) NULL,
    `to_status` VARCHAR(50) NOT NULL,
    `comments` TEXT NULL,
    `user_id` INT NOT NULL COMMENT 'References abr.usuarios.id',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE,
    INDEX idx_purchase_request_id (`purchase_request_id`),
    INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2.14 Add purchase_order_id to expenses table for linking
-- ============================================================================
ALTER TABLE `expenses`
ADD COLUMN IF NOT EXISTS `purchase_order_id` INT NULL COMMENT 'References purchase_orders.id if expense came from purchase',
ADD INDEX IF NOT EXISTS idx_purchase_order_id (`purchase_order_id`);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Purchase system created successfully!' AS status;

SELECT 'Tables created in accounting database:' AS info;
SHOW TABLES LIKE 'supplier%';
SHOW TABLES LIKE 'purchase%';
SHOW TABLES LIKE 'quotation%';
SHOW TABLES LIKE 'rfq%';

USE abr;
SELECT 'New role added:' AS info;
SELECT id, name, description FROM roles WHERE name = 'board_member';

SELECT 'New resources added:' AS info;
SELECT id, name, description FROM resources WHERE name LIKE 'purchase%' OR name = 'suppliers';
