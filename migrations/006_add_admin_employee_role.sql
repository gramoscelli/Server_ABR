-- Migration: Add admin_employee role
-- Date: 2025-11-08
-- Description: Adds 'admin_employee' role and consolidates socios, tirada, and cobrocuotas into unified "data" resource

USE abr;

-- Add admin_employee role with consolidated "data" resource permission
-- The "data" resource encompasses socios, tirada, and cobrocuotas as a single unified permission
INSERT INTO roles (name, description, permissions, is_system) VALUES
    (
        'admin_employee',
        'Administrative employee with full access to members, fees, and collections',
        JSON_OBJECT(
            'users', JSON_ARRAY(),
            'roles', JSON_ARRAY(),
            'api_keys', JSON_ARRAY(),
            'data', JSON_ARRAY('read', 'create', 'update', 'delete', 'print')
        ),
        FALSE
    )
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    permissions = VALUES(permissions);

-- Update all existing roles to use unified "data" resource instead of separate socios/tirada/cobrocuotas

-- Admin role: Full access including unified data resource
UPDATE roles
SET permissions = JSON_OBJECT(
    '*', JSON_ARRAY('*'),
    'users', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'roles', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'api_keys', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'data', JSON_ARRAY('create', 'read', 'update', 'delete', 'print')
),
description = 'Full administrative access to all resources (system role - cannot be modified)'
WHERE name = 'admin';

-- User role: Read-only access
UPDATE roles
SET permissions = JSON_OBJECT(
    'users', JSON_ARRAY('read'),
    'roles', JSON_ARRAY('read'),
    'api_keys', JSON_ARRAY('read'),
    'data', JSON_ARRAY('read')
),
description = 'Standard user with read-only access to all resources'
WHERE name = 'user';

-- Readonly role: Read-only access (no API keys)
UPDATE roles
SET permissions = JSON_OBJECT(
    'users', JSON_ARRAY('read'),
    'roles', JSON_ARRAY('read'),
    'api_keys', JSON_ARRAY(),
    'data', JSON_ARRAY('read')
),
description = 'Read-only access to resources'
WHERE name = 'readonly';

-- Printer role: Read + print for data
UPDATE roles
SET permissions = JSON_OBJECT(
    'users', JSON_ARRAY(),
    'roles', JSON_ARRAY(),
    'api_keys', JSON_ARRAY(),
    'data', JSON_ARRAY('read', 'print')
),
description = 'Printer client access (read tirada data for printing)'
WHERE name = 'printer';

-- New user role: No permissions
UPDATE roles
SET permissions = JSON_OBJECT(
    'users', JSON_ARRAY(),
    'roles', JSON_ARRAY(),
    'api_keys', JSON_ARRAY(),
    'data', JSON_ARRAY()
),
description = 'New user with no permissions (awaiting admin approval)'
WHERE name = 'new_user';

-- Migration complete
SELECT 'Migration 006: admin_employee role added successfully' as status;
SELECT id, name, description, JSON_PRETTY(permissions) as permissions FROM roles WHERE name = 'admin_employee';
