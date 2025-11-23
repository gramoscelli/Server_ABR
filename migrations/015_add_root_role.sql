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

-- Create initial admin user with root role if NO users exist in the system
-- This ensures a fresh installation has a default admin to login with
-- Password: admin123 (CHANGE IMMEDIATELY after first login!)
-- Hash generated with: bcrypt.hashSync('admin123', 10)
INSERT INTO usuarios (username, password_hash, email, role_id, is_active, email_verified, must_change_password, failed_attempts, created_at)
SELECT
    'admin',
    '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQHZJKCVo3deMK7KYS7jXhGiLz5K8a',
    'admin@localhost',
    r.id,
    TRUE,
    TRUE,  -- Email pre-verified for initial admin
    TRUE,  -- Force password change on first login
    0,
    NOW()
FROM roles r
WHERE r.name = 'root'
AND NOT EXISTS (SELECT 1 FROM usuarios LIMIT 1)  -- Only if NO users exist at all
ON DUPLICATE KEY UPDATE username = username;  -- No-op if exists

SELECT 'Migration 015: Root role and initial admin user created' as status;
SELECT '⚠️  IMPORTANT: Default admin password is "admin123" - CHANGE IT IMMEDIATELY!' as warning;
SELECT id, name, description FROM roles ORDER BY id;
SELECT id, username, email, role_id, must_change_password FROM usuarios;
