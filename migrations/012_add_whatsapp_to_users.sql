-- Add WhatsApp number column to usuarios table
-- Migration: 012_add_whatsapp_to_users.sql

ALTER TABLE `usuarios`
ADD COLUMN `whatsapp` VARCHAR(20) NULL
COMMENT 'WhatsApp phone number with country code (e.g., +1234567890)';

-- Add index for WhatsApp lookups if needed
CREATE INDEX `idx_whatsapp` ON `usuarios`(`whatsapp`);
