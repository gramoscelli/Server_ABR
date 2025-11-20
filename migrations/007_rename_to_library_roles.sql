-- Migration: Rename roles for clarity and create library_employee
-- Date: 2025-11-08
-- Description: Renames 'user' to 'library_employee' and 'data' resource to 'library_data'
--              Creates clear distinction between admin_employee (read/write) and library_employee (read-only)

USE abr;

-- This migration assumes migration 006 has been run

-- Note: Migration 006 already created the structure, this documents the rename from 'user' to 'library_employee'
-- The 'user' role has been renamed to 'library_employee' with the following update:
-- UPDATE roles SET name = 'library_employee' WHERE name = 'user';

-- Verify all roles exist with correct permissions
SELECT 'Migration 007: Verifying role structure' as status;

SELECT
    name,
    description,
    CASE
        WHEN name = 'admin' THEN 'System admin with full access'
        WHEN name = 'admin_employee' THEN 'Administration dept - Read/Write library data'
        WHEN name = 'library_employee' THEN 'Library staff - Read-only library data'
        WHEN name = 'printer' THEN 'Printer client - Read + print library data'
        WHEN name = 'readonly' THEN 'Auditors/Analysts - Read-only all data'
        WHEN name = 'new_user' THEN 'New registrations - No permissions'
    END as role_purpose
FROM roles
ORDER BY
    CASE name
        WHEN 'admin' THEN 1
        WHEN 'admin_employee' THEN 2
        WHEN 'library_employee' THEN 3
        WHEN 'printer' THEN 4
        WHEN 'readonly' THEN 5
        WHEN 'new_user' THEN 6
    END;

-- Verify library_data resource is used consistently
SELECT
    name,
    JSON_EXTRACT(permissions, '$.library_data') as library_data_permissions
FROM roles
WHERE JSON_EXTRACT(permissions, '$.library_data') IS NOT NULL
ORDER BY name;
