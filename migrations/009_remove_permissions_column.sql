-- Migration: Remove deprecated permissions column
-- Date: 2025-11-08
-- Description: Completes 3NF normalization by removing redundant permissions JSON column
--              All permission data is now stored in the role_permissions junction table

USE abr;

-- Verify that role_permissions table has all necessary data before dropping column
SELECT '=== Verification: Role Permissions in 3NF Structure ===' AS status;

SELECT
    ro.name AS role,
    GROUP_CONCAT(
        CONCAT(res.name, ':', JSON_EXTRACT(rp.actions, '$'))
        ORDER BY res.name
        SEPARATOR ' | '
    ) AS permissions_3nf
FROM roles ro
LEFT JOIN role_permissions rp ON ro.id = rp.role_id
LEFT JOIN resources res ON rp.resource_id = res.id
GROUP BY ro.id, ro.name
ORDER BY ro.id;

-- Drop the deprecated permissions column
-- This completes the 3NF normalization
ALTER TABLE roles DROP COLUMN permissions;

SELECT '' AS '';
SELECT '=== Migration 009: Permissions column removed ===' AS status;
SELECT 'The roles table is now fully normalized to 3NF' AS result;

-- Show final roles table structure
SELECT '' AS '';
SELECT 'Final roles table structure:' AS info;
DESCRIBE roles;
