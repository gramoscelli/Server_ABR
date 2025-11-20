# Database Schema - Third Normal Form (3NF)

## Overview

The roles and permissions system has been normalized to **Third Normal Form (3NF)** to eliminate data redundancy and improve data integrity.

## Why 3NF?

### Problems with the Old Structure:
- **JSON permissions column** contained repeating groups (multiple resource-action pairs)
- **Transitive dependency**: Permissions depended on roles, not directly on primary key
- **Multi-valued dependency**: A role could have many permissions with multiple actions
- **Data redundancy**: Same permission structures repeated across multiple roles
- **Difficult to query**: JSON column made it hard to query specific permissions
- **No referential integrity**: Couldn't enforce foreign keys within JSON

### Benefits of 3NF:
- ✅ Eliminates redundant data
- ✅ Ensures data integrity through foreign keys
- ✅ Makes queries more efficient and easier to write
- ✅ Allows granular permission management
- ✅ Follows database best practices
- ✅ Scalable for future resource additions

---

## Schema Structure

### Tables

#### 1. `roles` Table
Stores basic role information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Role ID |
| `name` | VARCHAR(50) | UNIQUE, NOT NULL | Role name (root, library_employee, etc.) |
| `description` | VARCHAR(255) | NULL | Human-readable description |
| `permissions` | JSON | NULL | **DEPRECATED** - Kept for backward compatibility |
| `is_system` | BOOLEAN | DEFAULT FALSE | System role cannot be deleted |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Note:** The `permissions` JSON column is deprecated and will be removed in a future version. Use `role_permissions` table instead.

---

#### 2. `resources` Table  (**NEW - 3NF**)
Stores available system resources.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Resource ID |
| `name` | VARCHAR(50) | UNIQUE, NOT NULL | Resource name (library_associateds, users, etc.) |
| `description` | VARCHAR(255) | NULL | Resource description |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Standard Resources:**
- `*` - Wildcard (all resources, root only)
- `users` - User account management
- `roles` - Role and permission management
- `api_keys` - API key management
- `library_associateds` - Library associates data (socios, tirada, cobrocuotas)

---

#### 3. `role_permissions` Table (**NEW - 3NF Junction Table**)
Links roles to resources with specific actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Permission ID |
| `role_id` | INT | NOT NULL, FOREIGN KEY → roles(id) | Role reference |
| `resource_id` | INT | NOT NULL, FOREIGN KEY → resources(id) | Resource reference |
| `actions` | JSON | NOT NULL, DEFAULT [] | Array of allowed actions |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Constraints:**
- Composite UNIQUE constraint: `(role_id, resource_id)` - Each role can have only one permission entry per resource
- Foreign key `role_id` cascades DELETE/UPDATE
- Foreign key `resource_id` cascades DELETE/UPDATE

**Indexes:**
- `idx_role_id` - Fast lookup by role
- `idx_resource_id` - Fast lookup by resource
- `unique_role_resource` - Ensures no duplicate permissions

---

## Relationships (ERD)

```
┌─────────────────┐
│     roles       │
│─────────────────│
│ id (PK)         │
│ name            │◄────────┐
│ description     │         │
│ is_system       │         │
│ created_at      │         │
│ updated_at      │         │
└─────────────────┘         │
                            │
                            │ 1:N
                            │
┌─────────────────────────┐ │
│  role_permissions       │ │
│─────────────────────────│ │
│ id (PK)                 │ │
│ role_id (FK) ───────────┘
│ resource_id (FK) ────────┐
│ actions (JSON)          │ │
│ created_at              │ │
│ updated_at              │ │
└─────────────────────────┘ │
                            │
                            │ N:1
                            │
┌─────────────────┐         │
│   resources     │         │
│─────────────────│         │
│ id (PK)         │◄────────┘
│ name            │
│ description     │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

---

## Normal Form Compliance

### First Normal Form (1NF):
✅ All attributes contain atomic values
✅ No repeating groups
✅ Each row is unique (primary keys)

### Second Normal Form (2NF):
✅ Complies with 1NF
✅ No partial dependencies (all non-key attributes depend on the entire primary key)
✅ `role_permissions` has composite candidate key (role_id, resource_id), and `actions` depends on both

### Third Normal Form (3NF):
✅ Complies with 2NF
✅ No transitive dependencies (no non-key attribute depends on another non-key attribute)
✅ Permissions no longer depend on role indirectly; they depend directly on the (role_id, resource_id) composite key

---

## Example Queries

### Get all permissions for a role:
```sql
SELECT
    ro.name AS role,
    res.name AS resource,
    rp.actions
FROM role_permissions rp
JOIN roles ro ON rp.role_id = ro.id
JOIN resources res ON rp.resource_id = res.id
WHERE ro.name = 'admin_employee';
```

### Check if a role has specific permission:
```sql
SELECT
    JSON_CONTAINS(rp.actions, '"read"') AS has_read_permission
FROM role_permissions rp
JOIN roles ro ON rp.role_id = ro.id
JOIN resources res ON rp.resource_id = res.id
WHERE ro.name = 'library_employee'
  AND res.name = 'library_associateds';
```

### Get all roles that can access a resource:
```sql
SELECT
    ro.name AS role,
    rp.actions
FROM role_permissions rp
JOIN roles ro ON rp.role_id = ro.id
JOIN resources res ON rp.resource_id = res.id
WHERE res.name = 'library_associateds';
```

### Grant permission:
```sql
INSERT INTO role_permissions (role_id, resource_id, actions)
SELECT
    ro.id,
    res.id,
    JSON_ARRAY('read', 'create')
FROM roles ro
CROSS JOIN resources res
WHERE ro.name = 'new_role'
  AND res.name = 'library_associateds'
ON DUPLICATE KEY UPDATE
    actions = VALUES(actions);
```

### Revoke permission:
```sql
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'some_role')
  AND resource_id = (SELECT id FROM resources WHERE name = 'library_associateds');
```

---

## Sequelize Model Usage

### Querying with associations:
```javascript
const { Role, Resource, RolePermission } = require('./models');

// Get role with all permissions
const role = await Role.findOne({
  where: { name: 'admin_employee' },
  include: [{
    model: RolePermission,
    as: 'rolePermissions',
    include: [{
      model: Resource,
      as: 'resource'
    }]
  }]
});

// Get resources through many-to-many
const role = await Role.findOne({
  where: { name: 'readonly' },
  include: [{
    model: Resource,
    as: 'resources',
    through: { attributes: ['actions'] }
  }]
});
```

### Checking permissions:
```javascript
// Old way (deprecated - uses JSON column)
const hasPermission = role.hasPermission('library_associateds', 'read');

// New way (3NF - uses junction table)
const permission = await RolePermission.findByRoleAndResource(role.id, resourceId);
const hasPermission = permission && permission.hasAction('read');
```

---

## Migration Path

1. ✅ **Migration 008** - Create `resources` and `role_permissions` tables
2. ✅ **Migration 008** - Migrate data from JSON `permissions` column to normalized tables
3. 🔄 **Code update** - Update models to use 3NF structure (backward compatible)
4. ⏳ **Future migration** - Drop deprecated `permissions` JSON column from `roles` table

---

## Backward Compatibility

The `permissions` JSON column is **deprecated but not yet removed**. This allows for:
- Gradual migration of code
- Testing of new structure before full cutover
- Rollback capability if issues arise

**Recommendation:** Update all code to use the 3NF structure, then drop the `permissions` column in a future migration.

---

## Performance Considerations

### Indexes:
- ✅ `role_id` indexed for fast role-based lookups
- ✅ `resource_id` indexed for fast resource-based lookups
- ✅ Composite UNIQUE on (role_id, resource_id) for integrity and lookup performance

### Query Optimization:
- Use JOIN queries instead of N+1 queries
- Include associations in Sequelize queries to reduce database round trips
- Consider caching frequently accessed permissions

---

## See Also

- [ROLES_SUMMARY.md](./ROLES_SUMMARY.md) - Role reference guide
- [ROLE_PERMISSIONS.md](./ROLE_PERMISSIONS.md) - Detailed permissions documentation
- [migrations/008_normalize_roles_to_3nf.sql](../migrations/008_normalize_roles_to_3nf.sql) - 3NF migration script
