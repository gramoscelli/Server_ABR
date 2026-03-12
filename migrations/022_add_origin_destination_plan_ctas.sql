-- Migration 022: Add double-entry bookkeeping columns (origin/destination) to operation tables
-- Each operation now tracks which plan_de_cuentas entry money comes FROM (origin) and goes TO (destination)

USE accounting;

-- ============================================================
-- 1. Add new columns to expenses
-- ============================================================
ALTER TABLE expenses
  ADD COLUMN origin_plan_cta_id INT NULL AFTER plan_cta_id,
  ADD COLUMN destination_plan_cta_id INT NULL AFTER origin_plan_cta_id;

-- 2. Add new columns to incomes
-- ============================================================
ALTER TABLE incomes
  ADD COLUMN origin_plan_cta_id INT NULL AFTER plan_cta_id,
  ADD COLUMN destination_plan_cta_id INT NULL AFTER origin_plan_cta_id;

-- 3. Add new columns to transfers
-- ============================================================
ALTER TABLE transfers
  ADD COLUMN origin_plan_cta_id INT NULL AFTER to_account_id,
  ADD COLUMN destination_plan_cta_id INT NULL AFTER origin_plan_cta_id;

-- ============================================================
-- 4. Add foreign keys
-- ============================================================
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_origin_plan_cta
    FOREIGN KEY (origin_plan_cta_id) REFERENCES plan_de_cuentas(id),
  ADD CONSTRAINT fk_expenses_destination_plan_cta
    FOREIGN KEY (destination_plan_cta_id) REFERENCES plan_de_cuentas(id);

ALTER TABLE incomes
  ADD CONSTRAINT fk_incomes_origin_plan_cta
    FOREIGN KEY (origin_plan_cta_id) REFERENCES plan_de_cuentas(id),
  ADD CONSTRAINT fk_incomes_destination_plan_cta
    FOREIGN KEY (destination_plan_cta_id) REFERENCES plan_de_cuentas(id);

ALTER TABLE transfers
  ADD CONSTRAINT fk_transfers_origin_plan_cta
    FOREIGN KEY (origin_plan_cta_id) REFERENCES plan_de_cuentas(id),
  ADD CONSTRAINT fk_transfers_destination_plan_cta
    FOREIGN KEY (destination_plan_cta_id) REFERENCES plan_de_cuentas(id);

-- ============================================================
-- 5. Migrate existing data
-- ============================================================

-- Expenses: origin = account's plan_cta (money leaves), destination = expense category (plan_cta_id)
UPDATE expenses e
  JOIN accounts a ON a.id = e.account_id
  SET e.origin_plan_cta_id = a.plan_cta_id
  WHERE a.plan_cta_id IS NOT NULL;

UPDATE expenses
  SET destination_plan_cta_id = plan_cta_id
  WHERE plan_cta_id IS NOT NULL;

-- Incomes: origin = income source (plan_cta_id), destination = account's plan_cta (money enters)
UPDATE incomes
  SET origin_plan_cta_id = plan_cta_id
  WHERE plan_cta_id IS NOT NULL;

UPDATE incomes i
  JOIN accounts a ON a.id = i.account_id
  SET i.destination_plan_cta_id = a.plan_cta_id
  WHERE a.plan_cta_id IS NOT NULL;

-- Transfers: origin = from_account's plan_cta, destination = to_account's plan_cta
UPDATE transfers t
  JOIN accounts a_from ON a_from.id = t.from_account_id
  SET t.origin_plan_cta_id = a_from.plan_cta_id
  WHERE a_from.plan_cta_id IS NOT NULL;

UPDATE transfers t
  JOIN accounts a_to ON a_to.id = t.to_account_id
  SET t.destination_plan_cta_id = a_to.plan_cta_id
  WHERE a_to.plan_cta_id IS NOT NULL;
