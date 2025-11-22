-- Migration: Add root role
-- Date: 2025-11-22
-- Description: Add root role as super administrator

USE abr;

-- Add root role if not exists
INSERT INTO roles (name, description, is_system)
VALUES ('root', 'Super administrator with full system access', 1)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Add permissions for root role in 3NF structure
INSERT INTO role_permissions (role_id, resource_id, actions)
SELECT r.id, res.id, '["*"]'
FROM roles r, resources res
WHERE r.name = 'root' AND res.name = '*'
ON DUPLICATE KEY UPDATE actions = VALUES(actions);

SELECT 'Migration 015: Root role added' as status;
SELECT id, name, description FROM roles ORDER BY id;
