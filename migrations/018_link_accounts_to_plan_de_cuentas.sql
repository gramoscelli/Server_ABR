-- Migration 018: Link accounts to plan_de_cuentas (mandatory)
-- Each account (cash, bank, other) must be linked to its corresponding
-- chart of accounts entry (grupo 11=Caja, 12=Bancos)

USE accounting;

-- 1. Insert missing plan_de_cuentas entries
INSERT IGNORE INTO plan_de_cuentas (codigo, nombre, tipo, grupo, is_active, created_at, updated_at)
VALUES
  (1102, 'CAJA CHICA', 'activo', '11', 1, NOW(), NOW()),
  (1206, 'BANCO GALICIA', 'activo', '12', 1, NOW(), NOW());

-- 2. Link accounts to their corresponding plan_de_cuentas entries
-- id=24 "Caja Chica" -> 1102 CAJA CHICA
UPDATE accounts SET plan_cta_id = (SELECT id FROM plan_de_cuentas WHERE codigo = 1102 LIMIT 1)
WHERE id = 24 AND plan_cta_id IS NULL;

-- id=25 "Banco Nacion - Cuenta Corriente" -> 1201 BANCO NACION CTA CTE
UPDATE accounts SET plan_cta_id = (SELECT id FROM plan_de_cuentas WHERE codigo = 1201 LIMIT 1)
WHERE id = 25 AND plan_cta_id IS NULL;

-- id=26 "Banco Provincia - Caja de Ahorro" -> 1202 BANCO PROVINCIA CTA CTE
UPDATE accounts SET plan_cta_id = (SELECT id FROM plan_de_cuentas WHERE codigo = 1202 LIMIT 1)
WHERE id = 26 AND plan_cta_id IS NULL;

-- id=27 "Mercado Pago" -> 1204 MERCADOPAGO
UPDATE accounts SET plan_cta_id = (SELECT id FROM plan_de_cuentas WHERE codigo = 1204 LIMIT 1)
WHERE id = 27 AND plan_cta_id IS NULL;

-- id=28 "Banco Galicia" -> 1206 BANCO GALICIA
UPDATE accounts SET plan_cta_id = (SELECT id FROM plan_de_cuentas WHERE codigo = 1206 LIMIT 1)
WHERE id = 28 AND plan_cta_id IS NULL;

-- id=23 "Caja Principal" -> 1101 CAJA (should already be linked, but ensure it)
UPDATE accounts SET plan_cta_id = (SELECT id FROM plan_de_cuentas WHERE codigo = 1101 LIMIT 1)
WHERE id = 23 AND plan_cta_id IS NULL;

-- 3. Drop existing FK with SET NULL (incompatible with NOT NULL)
ALTER TABLE accounts DROP FOREIGN KEY fk_accounts_plan_cta;

-- 4. Make plan_cta_id NOT NULL now that all accounts are linked
ALTER TABLE accounts MODIFY COLUMN plan_cta_id INT NOT NULL
  COMMENT 'Links to chart of accounts (plan de cuentas)';

-- 5. Recreate FK with RESTRICT instead of SET NULL
ALTER TABLE accounts ADD CONSTRAINT fk_accounts_plan_cta
  FOREIGN KEY (plan_cta_id) REFERENCES plan_de_cuentas(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Add UNIQUE constraint: each plan_de_cuentas entry can only be linked to one account
ALTER TABLE accounts ADD CONSTRAINT uq_accounts_plan_cta_id UNIQUE (plan_cta_id);
