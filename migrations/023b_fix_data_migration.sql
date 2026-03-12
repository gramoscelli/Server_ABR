-- Fix migration: Correct data migration from expenses/incomes/transfers to asientos
-- The original 023 migration used wrong column names. This script:
-- 1. Cleans up partial migration state
-- 2. Creates cuenta_contable entries for accounts without plan_cta_id mapping
-- 3. Creates a "Sin clasificar" cuenta for expenses/incomes without plan_cta_id
-- 4. Properly migrates all expenses/incomes/transfers to asientos
-- 5. Updates cash_reconciliations and purchase_orders
-- 6. Drops obsolete tables

USE `accounting`;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- CLEANUP: Remove partial migration data
-- ============================================================
DELETE FROM `cuenta_efectivo`;
DELETE FROM `cuenta_bancaria`;
DELETE FROM `asiento_detalle`;
DELETE FROM `asiento`;

-- Reset subtipo that was partially set
UPDATE `cuenta_contable` SET subtipo = NULL, requiere_detalle = 0 WHERE subtipo IS NOT NULL;

-- ============================================================
-- STEP 1: Create cuenta_contable entries for accounts without plan_cta_id
-- ============================================================

-- For each account without a plan_cta_id, create a cuenta_contable entry
-- Use codigo starting at 9001 to avoid conflicts

-- We'll use a stored procedure to handle this
DROP PROCEDURE IF EXISTS migrate_accounts;
DELIMITER //
CREATE PROCEDURE migrate_accounts()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_account_id INT;
  DECLARE v_name VARCHAR(100);
  DECLARE v_type VARCHAR(10);
  DECLARE v_next_code INT DEFAULT 9001;
  DECLARE v_new_id INT;

  DECLARE cur CURSOR FOR
    SELECT id, name, type FROM accounts WHERE plan_cta_id IS NULL;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  -- Find next available code in 9xxx range
  SELECT COALESCE(MAX(codigo), 9000) + 1 INTO v_next_code
  FROM cuenta_contable WHERE codigo >= 9000;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_account_id, v_name, v_type;
    IF done THEN LEAVE read_loop; END IF;

    INSERT INTO cuenta_contable (codigo, titulo, tipo, grupo, is_active)
    VALUES (v_next_code, v_name, 'activo', '1', 1);

    SET v_new_id = LAST_INSERT_ID();
    UPDATE accounts SET plan_cta_id = v_new_id WHERE id = v_account_id;
    SET v_next_code = v_next_code + 1;
  END LOOP;
  CLOSE cur;
END//
DELIMITER ;

CALL migrate_accounts();
DROP PROCEDURE IF EXISTS migrate_accounts;

-- Create "Gastos sin clasificar" cuenta for expenses without plan_cta_id
INSERT INTO cuenta_contable (codigo, titulo, tipo, grupo, is_active)
VALUES (5599, 'Gastos sin clasificar (migración)', 'egreso', '5', 1);
SET @gastos_sin_clasificar_id = LAST_INSERT_ID();

-- Create "Ingresos sin clasificar" cuenta for incomes without plan_cta_id
INSERT INTO cuenta_contable (codigo, titulo, tipo, grupo, is_active)
VALUES (4599, 'Ingresos sin clasificar (migración)', 'ingreso', '4', 1);
SET @ingresos_sin_clasificar_id = LAST_INSERT_ID();

-- ============================================================
-- STEP 2: Set subtipo on cuenta_contable for accounts
-- ============================================================

UPDATE cuenta_contable cc
  INNER JOIN accounts a ON a.plan_cta_id = cc.id
SET cc.subtipo = 'efectivo', cc.requiere_detalle = 1
WHERE a.type = 'cash';

UPDATE cuenta_contable cc
  INNER JOIN accounts a ON a.plan_cta_id = cc.id
SET cc.subtipo = 'bancaria', cc.requiere_detalle = 1
WHERE a.type = 'bank';

UPDATE cuenta_contable cc
  INNER JOIN accounts a ON a.plan_cta_id = cc.id
SET cc.subtipo = 'cobro_electronico', cc.requiere_detalle = 1
WHERE a.type = 'other';

-- ============================================================
-- STEP 3: Migrate accounts → extended tables
-- ============================================================

INSERT INTO cuenta_efectivo (id_cuenta, moneda, permite_arqueo)
SELECT a.plan_cta_id, COALESCE(a.currency, 'ARS'), 1
FROM accounts a
WHERE a.type = 'cash' AND a.plan_cta_id IS NOT NULL;

INSERT INTO cuenta_bancaria (id_cuenta, banco, nro_cuenta, moneda, activa)
SELECT a.plan_cta_id, COALESCE(a.bank_name, 'Sin especificar'), a.account_number, COALESCE(a.currency, 'ARS'), a.is_active
FROM accounts a
WHERE a.type = 'bank' AND a.plan_cta_id IS NOT NULL;

INSERT INTO cuenta_pago_electronico (id_cuenta, proveedor, tipo_medio)
SELECT a.plan_cta_id, a.name, 'General'
FROM accounts a
WHERE a.type = 'other' AND a.plan_cta_id IS NOT NULL;

-- ============================================================
-- STEP 4: Migrate expenses → asientos
-- ============================================================
-- Expense: debit plan_cta_id (expense category), credit account's plan_cta_id (payment source)
-- If expense has no plan_cta_id, use @gastos_sin_clasificar_id

INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id, created_at, updated_at)
SELECT
  e.date,
  CONCAT('MIG-E-', LPAD(e.id, 6, '0')),
  'egreso',
  COALESCE(e.description, 'Egreso migrado'),
  'confirmado',
  e.user_id,
  e.created_at,
  e.updated_at
FROM expenses e
INNER JOIN accounts a ON a.id = e.account_id
WHERE a.plan_cta_id IS NOT NULL;

-- Debit line: expense category (plan_cta_id) or fallback
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  asi.id_asiento,
  COALESCE(e.plan_cta_id, @gastos_sin_clasificar_id),
  'debe',
  e.amount,
  CONCAT('expense_id:', e.id)
FROM expenses e
INNER JOIN accounts a ON a.id = e.account_id
INNER JOIN asiento asi ON asi.nro_comprobante = CONCAT('MIG-E-', LPAD(e.id, 6, '0'))
WHERE a.plan_cta_id IS NOT NULL;

-- Credit line: payment source (account's plan_cta_id)
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  asi.id_asiento,
  a.plan_cta_id,
  'haber',
  e.amount,
  CONCAT('expense_id:', e.id)
FROM expenses e
INNER JOIN accounts a ON a.id = e.account_id
INNER JOIN asiento asi ON asi.nro_comprobante = CONCAT('MIG-E-', LPAD(e.id, 6, '0'))
WHERE a.plan_cta_id IS NOT NULL;

-- ============================================================
-- STEP 5: Migrate incomes → asientos
-- ============================================================
-- Income: debit account's plan_cta_id (asset receiving), credit plan_cta_id (income category)
-- If income has no plan_cta_id, use @ingresos_sin_clasificar_id

INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id, created_at, updated_at)
SELECT
  i.date,
  CONCAT('MIG-I-', LPAD(i.id, 6, '0')),
  'ingreso',
  COALESCE(i.description, 'Ingreso migrado'),
  'confirmado',
  i.user_id,
  i.created_at,
  i.updated_at
FROM incomes i
INNER JOIN accounts a ON a.id = i.account_id
WHERE a.plan_cta_id IS NOT NULL;

-- Debit line: asset receiving (account's plan_cta_id)
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  asi.id_asiento,
  a.plan_cta_id,
  'debe',
  i.amount,
  CONCAT('income_id:', i.id)
FROM incomes i
INNER JOIN accounts a ON a.id = i.account_id
INNER JOIN asiento asi ON asi.nro_comprobante = CONCAT('MIG-I-', LPAD(i.id, 6, '0'))
WHERE a.plan_cta_id IS NOT NULL;

-- Credit line: income category (plan_cta_id) or fallback
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  asi.id_asiento,
  COALESCE(i.plan_cta_id, @ingresos_sin_clasificar_id),
  'haber',
  i.amount,
  CONCAT('income_id:', i.id)
FROM incomes i
INNER JOIN accounts a ON a.id = i.account_id
INNER JOIN asiento asi ON asi.nro_comprobante = CONCAT('MIG-I-', LPAD(i.id, 6, '0'))
WHERE a.plan_cta_id IS NOT NULL;

-- ============================================================
-- STEP 6: Migrate transfers → asientos
-- ============================================================
-- Transfer: debit to_account's plan_cta_id, credit from_account's plan_cta_id
-- Only migrate transfers where BOTH accounts have plan_cta_id

INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id, created_at, updated_at)
SELECT
  t.date,
  CONCAT('MIG-T-', LPAD(t.id, 6, '0')),
  'transferencia',
  COALESCE(t.description, 'Transferencia migrada'),
  'confirmado',
  t.user_id,
  t.created_at,
  t.updated_at
FROM transfers t
INNER JOIN accounts a_from ON a_from.id = t.from_account_id
INNER JOIN accounts a_to ON a_to.id = t.to_account_id
WHERE a_from.plan_cta_id IS NOT NULL AND a_to.plan_cta_id IS NOT NULL;

-- Debit line: destination account
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  asi.id_asiento,
  a_to.plan_cta_id,
  'debe',
  t.amount,
  CONCAT('transfer_id:', t.id)
FROM transfers t
INNER JOIN accounts a_to ON a_to.id = t.to_account_id
INNER JOIN accounts a_from ON a_from.id = t.from_account_id
INNER JOIN asiento asi ON asi.nro_comprobante = CONCAT('MIG-T-', LPAD(t.id, 6, '0'))
WHERE a_from.plan_cta_id IS NOT NULL AND a_to.plan_cta_id IS NOT NULL;

-- Credit line: origin account
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe, referencia_operativa)
SELECT
  asi.id_asiento,
  a_from.plan_cta_id,
  'haber',
  t.amount,
  CONCAT('transfer_id:', t.id)
FROM transfers t
INNER JOIN accounts a_from ON a_from.id = t.from_account_id
INNER JOIN accounts a_to ON a_to.id = t.to_account_id
INNER JOIN asiento asi ON asi.nro_comprobante = CONCAT('MIG-T-', LPAD(t.id, 6, '0'))
WHERE a_from.plan_cta_id IS NOT NULL AND a_to.plan_cta_id IS NOT NULL;

-- ============================================================
-- STEP 7: Update cash_reconciliations
-- ============================================================

ALTER TABLE cash_reconciliations
  ADD COLUMN `id_cuenta` int NULL AFTER `account_id`;

UPDATE cash_reconciliations cr
  INNER JOIN accounts a ON a.id = cr.account_id
SET cr.id_cuenta = a.plan_cta_id;

-- Make id_cuenta NOT NULL after data migration
ALTER TABLE cash_reconciliations
  MODIFY COLUMN `id_cuenta` int NOT NULL,
  ADD CONSTRAINT `fk_reconciliations_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_contable` (`id`) ON DELETE RESTRICT;

-- Drop old FK and column
ALTER TABLE cash_reconciliations
  DROP FOREIGN KEY `cash_reconciliations_ibfk_1`,
  DROP INDEX `unique_account_date`,
  DROP COLUMN `account_id`,
  ADD UNIQUE KEY `unique_cuenta_date` (`id_cuenta`, `date`);

-- ============================================================
-- STEP 8: Update purchase_orders
-- ============================================================

ALTER TABLE purchase_orders
  ADD COLUMN `id_asiento` int NULL AFTER `expense_id`,
  ADD COLUMN `id_cuenta` int NULL AFTER `account_id`;

-- Map existing expense_id → asiento via migration comprobante
UPDATE purchase_orders po
  INNER JOIN asiento a ON a.nro_comprobante = CONCAT('MIG-E-', LPAD(po.expense_id, 6, '0'))
SET po.id_asiento = a.id_asiento
WHERE po.expense_id IS NOT NULL;

-- Map existing account_id → cuenta_contable via accounts.plan_cta_id
UPDATE purchase_orders po
  INNER JOIN accounts a ON a.id = po.account_id
SET po.id_cuenta = a.plan_cta_id
WHERE po.account_id IS NOT NULL;

-- Add FK constraints for new columns
ALTER TABLE purchase_orders
  ADD CONSTRAINT `fk_po_asiento` FOREIGN KEY (`id_asiento`) REFERENCES `asiento` (`id_asiento`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_po_cuenta` FOREIGN KEY (`id_cuenta`) REFERENCES `cuenta_contable` (`id`) ON DELETE SET NULL;

-- Drop old FKs and columns
ALTER TABLE purchase_orders
  DROP FOREIGN KEY `purchase_orders_ibfk_4`,
  DROP FOREIGN KEY `purchase_orders_ibfk_5`,
  DROP COLUMN `account_id`,
  DROP COLUMN `expense_id`;

-- Also update purchase_categories to drop expense_category FK
ALTER TABLE purchase_categories
  DROP FOREIGN KEY `purchase_categories_ibfk_2`,
  DROP COLUMN `expense_category_id`;

-- ============================================================
-- STEP 9: Drop obsolete tables
-- ============================================================

DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `incomes`;
DROP TABLE IF EXISTS `transfers`;
DROP TABLE IF EXISTS `transfer_types`;
DROP TABLE IF EXISTS `accounts`;
DROP TABLE IF EXISTS `expense_categories`;
DROP TABLE IF EXISTS `income_categories`;

SET FOREIGN_KEY_CHECKS = 1;
