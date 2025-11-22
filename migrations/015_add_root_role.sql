-- Migration: Add root role and initial root user
-- Date: 2025-11-22
-- Description: Add root role as super administrator and create initial root user

USE abr;

-- Add root role if not exists
INSERT INTO roles (name, description, is_system)
VALUES ('root', 'Super administrator with full system access', 1)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Add permissions for root role in 3NF structure (if resources table exists)
INSERT IGNORE INTO role_permissions (role_id, resource_id, actions)
SELECT r.id, res.id, '["*"]'
FROM roles r, resources res
WHERE r.name = 'root' AND res.name = '*';

-- Create initial root user if no users exist
-- Password: admin123 (CHANGE IMMEDIATELY after first login!)
-- Hash generated with: bcrypt.hashSync('admin123', 10)
INSERT INTO usuarios (username, password_hash, email, role_id, is_active, must_change_password, failed_attempts, created_at)
SELECT
    'root',
    '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQHZJKCVo3deMK7KYS7jXhGiLz5K8a',
    'root@localhost',
    r.id,
    TRUE,
    TRUE,  -- Force password change on first login
    0,
    NOW()
FROM roles r
WHERE r.name = 'root'
AND NOT EXISTS (SELECT 1 FROM usuarios WHERE role_id = r.id)
ON DUPLICATE KEY UPDATE username = username;  -- No-op if exists

SELECT 'Migration 015: Root role and initial user created' as status;
SELECT '⚠️  IMPORTANT: Default root password is "admin123" - CHANGE IT IMMEDIATELY!' as warning;
SELECT id, name, description FROM roles ORDER BY id;
SELECT id, username, email, role_id, must_change_password FROM usuarios;
