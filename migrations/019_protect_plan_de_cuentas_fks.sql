-- Migration 019: Protect plan_de_cuentas foreign keys
-- Change ON DELETE from SET NULL to RESTRICT to prevent silent data loss
-- when deleting a plan_de_cuentas entry that has associated operations

USE accounting;

-- 1. expenses.plan_cta_id: SET NULL → RESTRICT
ALTER TABLE expenses DROP FOREIGN KEY fk_expenses_plan_cta;
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_plan_cta
  FOREIGN KEY (plan_cta_id) REFERENCES plan_de_cuentas(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. incomes.plan_cta_id: SET NULL → RESTRICT
ALTER TABLE incomes DROP FOREIGN KEY fk_incomes_plan_cta;
ALTER TABLE incomes ADD CONSTRAINT fk_incomes_plan_cta
  FOREIGN KEY (plan_cta_id) REFERENCES plan_de_cuentas(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
