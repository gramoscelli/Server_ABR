-- Migration: Create roles table with ACL and migrate from ENUM to foreign key
-- Date: 2025-11-07
-- Description: Creates a proper roles table with ACL (Access Control List)
--              to replace ENUM and adds 'printer' role for printer client authentication

USE abr;

-- Step 1: Create roles table with ACL permissions
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    -- ACL Permissions (JSON format for flexibility)
    permissions JSON DEFAULT NULL,
    -- Lock admin role to prevent modifications
    is_system BOOLEAN DEFAULT FALSE COMMENT 'System role cannot be modified or deleted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_system (is_system)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Insert default roles with ACL permissions
INSERT INTO roles (name, description, permissions, is_system) VALUES
    (
        'root',
        'Super administrator with full system access (system role - cannot be modified)',
        JSON_OBJECT(
            'users', JSON_ARRAY('create', 'read', 'update', 'delete'),
            'roles', JSON_ARRAY('create', 'read', 'update', 'delete'),
            'api_keys', JSON_ARRAY('create', 'read', 'update', 'delete'),
            'tirada', JSON_ARRAY('create', 'read', 'update', 'delete', 'print'),
            'socios', JSON_ARRAY('create', 'read', 'update', 'delete'),
            'cobrocuotas', JSON_ARRAY('create', 'read', 'update', 'delete'),
            'accounting', JSON_ARRAY('create', 'read', 'update', 'delete'),
            'admin', JSON_ARRAY('create', 'read', 'update', 'delete'),
            '*', JSON_ARRAY('*')
        ),
        TRUE
    ),
    (
        'user',
        'Standard user access to most resources',
        JSON_OBJECT(
            'users', JSON_ARRAY('read'),
            'roles', JSON_ARRAY('read'),
            'api_keys', JSON_ARRAY('read'),
            'tirada', JSON_ARRAY('read', 'print'),
            'socios', JSON_ARRAY('read', 'update'),
            'cobrocuotas', JSON_ARRAY('read', 'update')
        ),
        FALSE
    ),
    (
        'readonly',
        'Read-only access to resources',
        JSON_OBJECT(
            'users', JSON_ARRAY('read'),
            'roles', JSON_ARRAY('read'),
            'api_keys', JSON_ARRAY(),
            'tirada', JSON_ARRAY('read'),
            'socios', JSON_ARRAY('read'),
            'cobrocuotas', JSON_ARRAY('read')
        ),
        FALSE
    ),
    (
        'printer',
        'Printer client access (read tirada data for printing)',
        JSON_OBJECT(
            'users', JSON_ARRAY(),
            'roles', JSON_ARRAY(),
            'api_keys', JSON_ARRAY(),
            'tirada', JSON_ARRAY('read', 'print'),
            'socios', JSON_ARRAY('read'),
            'cobrocuotas', JSON_ARRAY('read')
        ),
        FALSE
    )
ON DUPLICATE KEY UPDATE
    description = IF(VALUES(is_system) = TRUE AND is_system = TRUE, description, VALUES(description)),
    permissions = IF(VALUES(is_system) = TRUE AND is_system = TRUE, permissions, VALUES(permissions)),
    is_system = VALUES(is_system);

-- Step 3: Add role_id column to usuarios table
ALTER TABLE usuarios
ADD COLUMN role_id INT NULL AFTER email,
ADD CONSTRAINT fk_usuarios_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Step 4: Migrate existing role data from ENUM to role_id
UPDATE usuarios u
INNER JOIN roles r ON r.name = u.role
SET u.role_id = r.id;

-- Step 5: Make role_id NOT NULL after migration (all users should have a role)
ALTER TABLE usuarios
MODIFY COLUMN role_id INT NOT NULL;

-- Step 6: Drop the old role ENUM column
ALTER TABLE usuarios
DROP COLUMN role;

-- Step 7: Create a sample printer user for testing
-- Password: printer123 (hashed with bcrypt)
-- Note: To generate new hash: docker exec -i nodejs node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('printer123', 10).then(hash => console.log(hash));"
INSERT INTO usuarios (username, password_hash, email, role_id, active, failed_attempts, created_at)
SELECT
    'printer_client',
    '$2b$10$nKEFOKIs9IjTclWd89xPWuGzs5KBSeIpy5bUruF4m7sW0l/LQKNc.',  -- bcrypt hash of 'printer123'
    'printer@example.com',
    r.id,
    TRUE,
    0,
    NOW()
FROM roles r
WHERE r.name = 'printer'
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    role_id = (SELECT id FROM roles WHERE name = 'printer');

-- Migration complete
SELECT 'Migration 003: Roles table with ACL created and data migrated successfully' as status;
SELECT id, name, description, JSON_PRETTY(permissions) as permissions FROM roles;
SELECT id, username, role_id FROM usuarios ORDER BY id;
