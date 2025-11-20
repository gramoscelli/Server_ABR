-- Migration: Add new_user role
-- Date: 2025-11-07
-- Description: Adds 'new_user' role with no permissions for new registrations

USE abr;

-- Add new_user role with no permissions
INSERT INTO roles (name, description, permissions, is_system) VALUES
    (
        'new_user',
        'New user with no permissions (awaiting admin approval)',
        JSON_OBJECT(
            'users', JSON_ARRAY(),
            'roles', JSON_ARRAY(),
            'api_keys', JSON_ARRAY(),
            'tirada', JSON_ARRAY(),
            'socios', JSON_ARRAY(),
            'cobrocuotas', JSON_ARRAY()
        ),
        FALSE
    )
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    permissions = VALUES(permissions);

-- Migration complete
SELECT 'Migration 005: new_user role added successfully' as status;
SELECT id, name, description, JSON_PRETTY(permissions) as permissions FROM roles WHERE name = 'new_user';
