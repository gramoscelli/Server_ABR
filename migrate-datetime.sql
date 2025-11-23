-- Migration: Change date fields from DATE to DATETIME
-- This migration updates the accounting tables to support date and time

USE accounting;

-- Update Expenses table
ALTER TABLE expenses
MODIFY COLUMN date DATETIME NOT NULL;

-- Update Incomes table
ALTER TABLE incomes
MODIFY COLUMN date DATETIME NOT NULL;

-- Update Transfers table
ALTER TABLE transfers
MODIFY COLUMN date DATETIME NOT NULL;

-- Verify changes
DESCRIBE expenses;
DESCRIBE incomes;
DESCRIBE transfers;
