-- Migration 021: Add "AJUSTE CONTABLE" entries to plan_de_cuentas
-- These are used when balance adjustments are made, so the operation
-- is trackable as a proper income or expense.

USE accounting;

-- Ajuste contable positivo (ingreso)
INSERT IGNORE INTO plan_de_cuentas (codigo, nombre, tipo, grupo, is_active, created_at, updated_at)
VALUES (4901, 'AJUSTE CONTABLE', 'ingreso', '49', 1, NOW(), NOW());

-- Ajuste contable negativo (egreso)
INSERT IGNORE INTO plan_de_cuentas (codigo, nombre, tipo, grupo, is_active, created_at, updated_at)
VALUES (5901, 'AJUSTE CONTABLE', 'egreso', '59', 1, NOW(), NOW());
