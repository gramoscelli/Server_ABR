-- Migration 020: Remove unused expense_categories and income_categories tables
-- These tables are not used by the application. All categorization is done
-- via plan_de_cuentas (chart of accounts).

USE accounting;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Drop FK from purchase_categories to expense_categories
ALTER TABLE purchase_categories DROP FOREIGN KEY purchase_categories_ibfk_2;
ALTER TABLE purchase_categories DROP COLUMN expense_category_id;

-- 2. Drop FK from expenses to expense_categories
ALTER TABLE expenses DROP FOREIGN KEY expenses_ibfk_1;
ALTER TABLE expenses DROP COLUMN category_id;

-- 3. Drop FK from incomes to income_categories
ALTER TABLE incomes DROP FOREIGN KEY incomes_ibfk_1;
ALTER TABLE incomes DROP COLUMN category_id;

-- 4. Drop the unused tables
DROP TABLE IF EXISTS expense_categories;
DROP TABLE IF EXISTS income_categories;

SET FOREIGN_KEY_CHECKS = 1;
