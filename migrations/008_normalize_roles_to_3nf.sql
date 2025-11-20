-- Migration: Normalize roles table to 3NF
-- Date: 2025-11-08
-- Description: Separates permissions into normalized tables following Third Normal Form (3NF)
--              Creates: resources table, role_permissions table
--              Migrates existing JSON permissions to normalized structure

USE abr;

-- Step 1: Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Available system resources for permissions';

-- Step 2: Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    resource_id INT NOT NULL,
    actions JSON NOT NULL COMMENT 'Array of allowed actions: ["read", "create", "update", "delete", "print"]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_resource (role_id, resource_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_role_id (role_id),
    INDEX idx_resource_id (resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Junction table linking roles to resources with specific actions';

-- Step 3: Insert standard resources
INSERT INTO resources (name, description) VALUES
    ('*', 'Wildcard - all resources (admin only)'),
    ('users', 'User account management'),
    ('roles', 'Role and permission management'),
    ('api_keys', 'API key management'),
    ('library_associateds', 'Library associates, members, fees, and charges (socios, tirada, cobrocuotas)')
ON DUPLICATE KEY UPDATE
    description = VALUES(description);

-- Step 4: Migrate existing permissions from roles.permissions JSON to role_permissions table
-- Admin role (id=1) - wildcard permission
INSERT INTO role_permissions (role_id, resource_id, actions)
SELECT
    1 as role_id,
    r.id as resource_id,
    JSON_ARRAY('*') as actions
FROM resources r
WHERE r.name = '*'
ON DUPLICATE KEY UPDATE actions = VALUES(actions);

-- library_employee role (id=2) - read library_associateds
INSERT INTO role_permissions (role_id, resource_id, actions)
SELECT
    2 as role_id,
    r.id as resource_id,
    JSON_ARRAY('read') as actions
FROM resources r
WHERE r.name = 'library_associateds'
ON DUPLICATE KEY UPDATE actions = VALUES(actions);

-- readonly role (id=3) - read users, roles, library_associateds
INSERT INTO role_permissions (role_id, resource_id, actions)
SELECT
    3 as role_id,
    r.id as resource_id,
    JSON_ARRAY('read') as actions
FROM resources r
WHERE r.name IN ('users', 'roles', 'library_associateds')
ON DUPLICATE KEY UPDATE actions = VALUES(actions);

-- printer role (id=4) - read + print library_associateds
INSERT INTO role_permissions (role_id, resource_id, actions)
SELECT
    4 as role_id,
    r.id as resource_id,
    JSON_ARRAY('read', 'print') as actions
FROM resources r
WHERE r.name = 'library_associateds'
ON DUPLICATE KEY UPDATE actions = VALUES(actions);

-- new_user role (id=5) - no permissions (no inserts needed)

-- admin_employee role (id=6) - full CRUD + print on library_associateds
INSERT INTO role_permissions (role_id, resource_id, actions)
SELECT
    6 as role_id,
    r.id as resource_id,
    JSON_ARRAY('create', 'read', 'update', 'delete', 'print') as actions
FROM resources r
WHERE r.name = 'library_associateds'
ON DUPLICATE KEY UPDATE actions = VALUES(actions);

-- Step 5: Verify migration
SELECT '=== Migration 008: 3NF Normalization Complete ===' as status;

SELECT 'Resources created:' as info;
SELECT id, name, description FROM resources ORDER BY id;

SELECT '' as spacer;
SELECT 'Role permissions migrated:' as info;
SELECT
    ro.name as role,
    res.name as resource,
    rp.actions
FROM role_permissions rp
JOIN roles ro ON rp.role_id = ro.id
JOIN resources res ON rp.resource_id = res.id
ORDER BY ro.id, res.name;

-- Note: The old 'permissions' JSON column in roles table can be dropped after verifying the migration
-- This will be done in a separate migration after code is updated to use the new structure
