-- Migration 011: Update admin_employee to use wildcard permissions
-- Date: 2025-11-08
-- Description: Changes admin_employee permissions from explicit actions to wildcard (*)
--              This allows admin_employee to perform any action on library_associateds,
--              including future actions that may be added to the system.

USE abr;

-- Update admin_employee to have wildcard permissions on library_associateds
UPDATE role_permissions
SET actions = '["*"]'
WHERE role_id = (SELECT id FROM roles WHERE name='admin_employee')
  AND resource_id = (SELECT id FROM resources WHERE name='library_associateds');

-- Verification query:
-- SELECT r.name as role, res.name as resource, rp.actions
-- FROM role_permissions rp
-- JOIN roles r ON rp.role_id = r.id
-- JOIN resources res ON rp.resource_id = res.id
-- WHERE r.name='admin_employee';
--
-- Expected result: admin_employee | library_associateds | ["*"]
