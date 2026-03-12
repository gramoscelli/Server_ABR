-- Migration: Refactor to formal double-entry bookkeeping (partida doble)
-- Database: accounting
-- Created: 2026-03-12
-- Description: Replaces expenses/incomes/transfers with formal journal entries (asientos contables)
--   - Renames plan_de_cuentas → cuenta_contable with extended fields
--   - Creates asiento (journal entry header) and asiento_detalle (entry lines)
--   - Creates specialized account extension tables (efectivo, bancaria, pago electronico)
--   - Migrates existing data from expenses/incomes/transfers into asientos
--   - Drops obsolete tables

USE `accounting`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- PHASE 1A: Transform plan_de_cuentas → cuenta_contable
-- ============================================================

-- Add new columns before rename
ALTER TABLE `plan_de_cuentas`
  CHANGE COLUMN `nombre` `titulo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Account title',
  ADD COLUMN `descripcion` text COLLATE utf8mb4_unicode_ci NULL AFTER `titulo`,
  MODIFY COLUMN `tipo` enum('activo','pasivo','patrimonio','ingreso','egreso') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '1=activo,2=pasivo,3=patrimonio,4=ingreso,5=egreso',
  ADD COLUMN `subtipo` enum('efectivo','bancaria','cobro_electronico','credito_cobrar','pasivo_liquidar') COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL AFTER `tipo`,
  ADD COLUMN `requiere_detalle` tinyint(1) NOT NULL DEFAULT 0 AFTER `subtipo`;

RENAME TABLE `plan_de_cuentas` TO `cuenta_contable`;

-- ============================================================
-- PHASE 1B: Create new tables
-- ============================================================

-- Journal entry header
CREATE TABLE IF NOT EXISTS `asiento` (
  `id_asiento` int NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `nro_comprobante` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Sequential voucher number',
  `origen` enum('manual','ingreso','egreso','transferencia','ajuste','compra','liquidacion') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual' COMMENT 'Source operation type',
  `concepto` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Entry description/concept',
  `estado` enum('borrador','confirmado','anulado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `usuario_id` int NOT NULL COMMENT 'References abr.usuarios.id',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_asiento`),
  UNIQUE KEY `uk_nro_comprobante` (`nro_comprobante`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_estado` (`estado`),
  KEY `idx_origen` (`origen`),
  KEY `idx_usuario_id` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal entry detail lines (debit/credit)
CREATE TABLE IF NOT EXISTS `asiento_detalle` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_asiento` int NOT NULL,
  `id_cuenta` int NOT NULL COMMENT 'FK to cuenta_contable',
  `tipo_mov` enum('debe','haber') COLLATE utf8mb4_unicode_ci NOT NULL,
  `importe` decimal(15,2) NOT NULL,
  `referencia_operativa` varchar(255) COLLATE utf8mb4_unicode_ci NULL COMMENT 'Optional reference (invoice number, receipt, etc.)',
  PRIMARY KEY (`id_detalle`),
  KEY `idx_id_asiento` (`id_asiento`),
  KEY `idx_id_cuenta` (`id_cuenta`),
  KEY `idx_tipo_mov` (`tipo_mov`),
  CONSTRAINT `fk_detalle_asiento` FOREIGN KEY (`id_asiento`) REFERENCES `asiento` (`id_asiento`) ON DELETE CASCADE,
  CONSTRAINT `fk_detalle_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_contable` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cash account extension
CREATE TABLE IF NOT EXISTS `cuenta_efectivo` (
  `id_cuenta` int NOT NULL COMMENT 'PK + FK to cuenta_contable',
  `sucursal` varchar(100) COLLATE utf8mb4_unicode_ci NULL COMMENT 'Branch/location',
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci NULL COMMENT 'Person responsible for cash',
  `moneda` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ARS',
  `permite_arqueo` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether reconciliation is allowed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cuenta`),
  CONSTRAINT `fk_efectivo_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_contable` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bank account extension
CREATE TABLE IF NOT EXISTS `cuenta_bancaria` (
  `id_cuenta` int NOT NULL COMMENT 'PK + FK to cuenta_contable',
  `banco` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nro_cuenta` varchar(50) COLLATE utf8mb4_unicode_ci NULL,
  `cbu` varchar(22) COLLATE utf8mb4_unicode_ci NULL,
  `alias` varchar(50) COLLATE utf8mb4_unicode_ci NULL,
  `moneda` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ARS',
  `tipo_cuenta` enum('caja_ahorro','cuenta_corriente') COLLATE utf8mb4_unicode_ci NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cuenta`),
  CONSTRAINT `fk_bancaria_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_contable` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Electronic payment account extension
CREATE TABLE IF NOT EXISTS `cuenta_pago_electronico` (
  `id_cuenta` int NOT NULL COMMENT 'PK + FK to cuenta_contable',
  `proveedor` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g., Mercado Pago, Ualá, etc.',
  `tipo_medio` varchar(100) COLLATE utf8mb4_unicode_ci NULL COMMENT 'QR, link de pago, POS, etc.',
  `plazo_acreditacion` int NULL DEFAULT 0 COMMENT 'Days until funds are credited',
  `liquidacion_diferida` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether settlement is deferred',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cuenta`),
  CONSTRAINT `fk_pago_electronico_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_contable` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Electronic settlement tracking
CREATE TABLE IF NOT EXISTS `liquidacion_electronica` (
  `id_liquidacion` int NOT NULL AUTO_INCREMENT,
  `id_cuenta` int NOT NULL COMMENT 'FK to cuenta_pago_electronico',
  `fecha_operacion` date NOT NULL,
  `fecha_acreditacion` date NULL,
  `estado` enum('pendiente','acreditada','rechazada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `importe_bruto` decimal(15,2) NOT NULL,
  `comision` decimal(15,2) NOT NULL DEFAULT 0.00,
  `importe_neto` decimal(15,2) GENERATED ALWAYS AS (`importe_bruto` - `comision`) STORED,
  `id_asiento_origen` int NULL COMMENT 'FK to asiento that generated this settlement',
  `id_asiento_acreditacion` int NULL COMMENT 'FK to asiento when credited',
  `referencia` varchar(255) COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_liquidacion`),
  KEY `idx_id_cuenta` (`id_cuenta`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_operacion` (`fecha_operacion`),
  CONSTRAINT `fk_liquidacion_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_pago_electronico` (`id_cuenta`) ON DELETE RESTRICT,
  CONSTRAINT `fk_liquidacion_asiento_origen` FOREIGN KEY (`id_asiento_origen`) REFERENCES `asiento` (`id_asiento`) ON DELETE SET NULL,
  CONSTRAINT `fk_liquidacion_asiento_acred` FOREIGN KEY (`id_asiento_acreditacion`) REFERENCES `asiento` (`id_asiento`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PHASE 1C: Migrate existing data
-- ============================================================

-- 1C.1: Migrate accounts → extended tables and set subtipo on cuenta_contable

-- Set subtipo for cash accounts
UPDATE `cuenta_contable` cc
  INNER JOIN `accounts` a ON a.plan_cta_id = cc.id
SET cc.subtipo = 'efectivo', cc.requiere_detalle = 1
WHERE a.type = 'cash';

-- Set subtipo for bank accounts
UPDATE `cuenta_contable` cc
  INNER JOIN `accounts` a ON a.plan_cta_id = cc.id
SET cc.subtipo = 'bancaria', cc.requiere_detalle = 1
WHERE a.type = 'bank';

-- Migrate cash accounts to cuenta_efectivo
INSERT INTO `cuenta_efectivo` (id_cuenta, moneda, permite_arqueo)
SELECT a.plan_cta_id, COALESCE(a.currency, 'ARS'), 1
FROM `accounts` a
WHERE a.type = 'cash' AND a.plan_cta_id IS NOT NULL;

-- Migrate bank accounts to cuenta_bancaria
INSERT INTO `cuenta_bancaria` (id_cuenta, banco, nro_cuenta, moneda, activa)
SELECT a.plan_cta_id, COALESCE(a.bank_name, 'Sin especificar'), a.account_number, COALESCE(a.currency, 'ARS'), a.is_active
FROM `accounts` a
WHERE a.type = 'bank' AND a.plan_cta_id IS NOT NULL;

-- 1C.2: Migrate expenses → asientos
-- Each expense becomes a 2-line journal entry: debit destination (expense account), credit origin (asset account)

INSERT INTO `asiento` (fecha, nro_comprobante, origen, concepto, estado, usuario_id, created_at, updated_at)
SELECT
  e.date,
  CONCAT('MIG-E-', LPAD(e.id, 6, '0')),
  'egreso',
  COALESCE(e.description, 'Egreso migrado'),
  'confirmado',
  e.user_id,
  e.created_at,
  e.updated_at
FROM `expenses` e
WHERE e.origin_plan_cta_id IS NOT NULL AND e.destination_plan_cta_id IS NOT NULL;

-- Debit line (destination = expense account)
INSERT INTO `asiento_detalle` (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  a.id_asiento,
  e.destination_plan_cta_id,
  'debe',
  e.amount,
  CONCAT('expense_id:', e.id)
FROM `expenses` e
INNER JOIN `asiento` a ON a.nro_comprobante = CONCAT('MIG-E-', LPAD(e.id, 6, '0'));

-- Credit line (origin = asset account that paid)
INSERT INTO `asiento_detalle` (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  a.id_asiento,
  e.origin_plan_cta_id,
  'haber',
  e.amount,
  CONCAT('expense_id:', e.id)
FROM `expenses` e
INNER JOIN `asiento` a ON a.nro_comprobante = CONCAT('MIG-E-', LPAD(e.id, 6, '0'));

-- 1C.3: Migrate incomes → asientos
-- Each income becomes a 2-line journal entry: debit destination (asset account), credit origin (income account)

INSERT INTO `asiento` (fecha, nro_comprobante, origen, concepto, estado, usuario_id, created_at, updated_at)
SELECT
  i.date,
  CONCAT('MIG-I-', LPAD(i.id, 6, '0')),
  'ingreso',
  COALESCE(i.description, 'Ingreso migrado'),
  'confirmado',
  i.user_id,
  i.created_at,
  i.updated_at
FROM `incomes` i
WHERE i.origin_plan_cta_id IS NOT NULL AND i.destination_plan_cta_id IS NOT NULL;

INSERT INTO `asiento_detalle` (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  a.id_asiento,
  i.destination_plan_cta_id,
  'debe',
  i.amount,
  CONCAT('income_id:', i.id)
FROM `incomes` i
INNER JOIN `asiento` a ON a.nro_comprobante = CONCAT('MIG-I-', LPAD(i.id, 6, '0'));

INSERT INTO `asiento_detalle` (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  a.id_asiento,
  i.origin_plan_cta_id,
  'haber',
  i.amount,
  CONCAT('income_id:', i.id)
FROM `incomes` i
INNER JOIN `asiento` a ON a.nro_comprobante = CONCAT('MIG-I-', LPAD(i.id, 6, '0'));

-- 1C.4: Migrate transfers → asientos
-- Each transfer becomes a 2-line journal entry: debit destination, credit origin

INSERT INTO `asiento` (fecha, nro_comprobante, origen, concepto, estado, usuario_id, created_at, updated_at)
SELECT
  t.date,
  CONCAT('MIG-T-', LPAD(t.id, 6, '0')),
  'transferencia',
  COALESCE(t.description, 'Transferencia migrada'),
  'confirmado',
  t.user_id,
  t.created_at,
  t.updated_at
FROM `transfers` t
WHERE t.origin_plan_cta_id IS NOT NULL AND t.destination_plan_cta_id IS NOT NULL;

INSERT INTO `asiento_detalle` (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  a.id_asiento,
  t.destination_plan_cta_id,
  'debe',
  t.amount,
  CONCAT('transfer_id:', t.id)
FROM `transfers` t
INNER JOIN `asiento` a ON a.nro_comprobante = CONCAT('MIG-T-', LPAD(t.id, 6, '0'));

INSERT INTO `asiento_detalle` (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  a.id_asiento,
  t.origin_plan_cta_id,
  'haber',
  t.amount,
  CONCAT('transfer_id:', t.id)
FROM `transfers` t
INNER JOIN `asiento` a ON a.nro_comprobante = CONCAT('MIG-T-', LPAD(t.id, 6, '0'));

-- 1C.5: Update cash_reconciliations to point to cuenta_contable via accounts.plan_cta_id
-- First add new column
ALTER TABLE `cash_reconciliations`
  ADD COLUMN `id_cuenta` int NULL AFTER `account_id`;

UPDATE `cash_reconciliations` cr
  INNER JOIN `accounts` a ON a.id = cr.account_id
SET cr.id_cuenta = a.plan_cta_id;

-- Make id_cuenta NOT NULL after data migration
ALTER TABLE `cash_reconciliations`
  MODIFY COLUMN `id_cuenta` int NOT NULL,
  ADD CONSTRAINT `fk_reconciliations_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_contable` (`id`) ON DELETE RESTRICT;

-- Drop old FK and column
ALTER TABLE `cash_reconciliations`
  DROP FOREIGN KEY `cash_reconciliations_ibfk_1`,
  DROP INDEX `unique_account_date`,
  DROP COLUMN `account_id`,
  ADD UNIQUE KEY `unique_cuenta_date` (`id_cuenta`, `date`);

-- 1C.6: Update purchase_orders to reference asiento instead of expense, and cuenta_contable instead of accounts
ALTER TABLE `purchase_orders`
  ADD COLUMN `id_asiento` int NULL AFTER `expense_id`,
  ADD COLUMN `id_cuenta` int NULL AFTER `account_id`;

-- Map existing expense_id → asiento via migration comprobante
UPDATE `purchase_orders` po
  INNER JOIN `asiento` a ON a.nro_comprobante = CONCAT('MIG-E-', LPAD(po.expense_id, 6, '0'))
SET po.id_asiento = a.id_asiento
WHERE po.expense_id IS NOT NULL;

-- Map existing account_id → cuenta_contable via accounts.plan_cta_id
UPDATE `purchase_orders` po
  INNER JOIN `accounts` a ON a.id = po.account_id
SET po.id_cuenta = a.plan_cta_id
WHERE po.account_id IS NOT NULL;

-- Add FK constraints for new columns
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `fk_po_asiento` FOREIGN KEY (`id_asiento`) REFERENCES `asiento` (`id_asiento`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_po_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_contable` (`id`) ON DELETE SET NULL;

-- Drop old FKs and columns
ALTER TABLE `purchase_orders`
  DROP FOREIGN KEY `purchase_orders_ibfk_4`,
  DROP FOREIGN KEY `purchase_orders_ibfk_5`,
  DROP COLUMN `account_id`,
  DROP COLUMN `expense_id`;

-- Also update purchase_categories to drop expense_category FK (categories being removed)
ALTER TABLE `purchase_categories`
  DROP FOREIGN KEY `purchase_categories_ibfk_2`,
  DROP COLUMN `expense_category_id`;

-- ============================================================
-- PHASE 1D: Drop obsolete tables
-- ============================================================

DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `incomes`;
DROP TABLE IF EXISTS `transfers`;
DROP TABLE IF EXISTS `transfer_types`;
DROP TABLE IF EXISTS `accounts`;
DROP TABLE IF EXISTS `expense_categories`;
DROP TABLE IF EXISTS `income_categories`;

SET FOREIGN_KEY_CHECKS = 1;
