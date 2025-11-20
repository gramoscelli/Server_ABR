-- Migration 010: Remove printer and readonly roles
-- Date: 2025-11-08
-- Description: Removes printer and readonly roles from the system.
--              Printer applications should now use the logged-in Windows user's credentials
--              instead of a dedicated printer account.
--              Readonly role has no meaning in the current system architecture.

USE abr;

-- Step 1: Migrate any users with printer or readonly roles to new_user
-- (They will need to be manually reassigned by root)
UPDATE usuarios
SET role_id = (SELECT id FROM roles WHERE name='new_user')
WHERE role_id IN (SELECT id FROM roles WHERE name IN ('printer', 'readonly'));

-- Step 2: Delete printer and readonly roles
-- This will CASCADE delete their permissions in role_permissions table
DELETE FROM roles WHERE name IN ('printer', 'readonly');

-- Verification queries:
-- SELECT id, name FROM roles ORDER BY id;
-- SELECT rp.id, r.name as role, res.name as resource, rp.actions
-- FROM role_permissions rp
-- JOIN roles r ON rp.role_id = r.id
-- JOIN resources res ON rp.resource_id = res.id
-- ORDER BY rp.id;
