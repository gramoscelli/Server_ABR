# Role-Based Access Control (RBAC) - Permissions Matrix

This document provides a comprehensive overview of all roles and their permissions in the biblio-server application.

## Overview

The system uses a role-based access control (RBAC) model where each user is assigned a role, and each role has specific permissions for different resources.

## Roles

### 1. Root (`root`)
**System Role** - Cannot be modified or deleted

**Description:** Full administrative access to all resources and operations.

**Permissions:**
- Wildcard permission: `*` : `[*]`
- Can perform any action on any resource
- Can create, modify, and delete users
- Can manage roles and permissions
- Can create and revoke API keys
- Full access to all data resources

**Use Cases:**
- System administrators
- Database administrators
- DevOps team

---

### 2. Root Employee (`admin_employee`)
**Standard Role** - Can be modified

**Description:** Administrative employee with full access to member management, fee collections, and fee charges (wildcard permissions). All three core resources (tirada, socios, cobrocuotas) have identical permission levels.

**Permissions:**

| Resource | Actions Allowed |
|----------|----------------|
| `users`    | *(none)* |
| `roles`    | *(none)* |
| `api_keys` | *(none)* |
| `library_associateds` | `*` (wildcard - all actions) |

**Note:** The `library_associateds` resource is a unified permission that encompasses:
- `tirada` (fee collection records)
- `socios` (member data)
- `cobrocuotas` (fee charges)

These three resources are treated as inseparable and always have identical permission levels.

**What they can do:**
- ✅ **All actions** on library_associateds (wildcard `*` permission)
- ✅ Full CRUD + print access to all library data (tirada, socios, cobrocuotas)
- ✅ Can perform any current or future actions on library data
- ❌ Cannot access users or roles
- ❌ Cannot manage API keys

**Use Cases:**
- Administrative staff managing member records
- Employees handling fee collections and charges
- Staff responsible for printing receipts
- Front desk personnel

---

### 3. Library Employee (`library_employee`)
**Standard Role** - Can be modified

**Description:** Library staff with read and print access to library associates data.

**Permissions:**

| Resource | Actions Allowed |
|----------|----------------|
| `users` | *(none)* |
| `roles` | *(none)* |
| `api_keys` | *(none)* |
| `library_associateds` | `read`, `print` |

**What they can do:**
- ✅ Read library member data (socios)
- ✅ Read fee collection data (tirada)
- ✅ Read fee charges (cobrocuotas)
- ✅ Print library data (printer applications use logged-in Windows user credentials)
- ❌ Cannot modify any data
- ❌ Cannot access users, roles, or API keys

**Use Cases:**
- Library front desk staff
- Information desk employees
- Staff who need to view and print member information
- Printer applications (using Windows logged-in user credentials)

**Important:** Printer applications should authenticate using the Windows logged-in user's credentials, not a separate printer account.

---

### 4. New User (`new_user`)
**Default Registration Role** - Can be modified

**Description:** No permissions - assigned to all new registrations. Requires root approval to upgrade.

**Permissions:**

| Resource | Actions Allowed |
|----------|----------------|
| `users` | *(none)* |
| `roles` | *(none)* |
| `api_keys` | *(none)* |
| `tirada` | *(none)* |
| `socios` | *(none)* |
| `cobrocuotas` | *(none)* |

**What they can do:**
- ❌ Cannot access any protected endpoints
- ❌ Cannot read any data
- ❌ Cannot modify any data
- ✅ Can login and get JWT tokens
- ✅ Can change their own password

**Use Cases:**
- All new user registrations (password or OAuth)
- Prevents unauthorized access by default
- Requires root to manually grant permissions

**Security Rationale:**
This role exists to prevent security issues where:
- Anyone can register an account
- New accounts could immediately access sensitive data
- Root review is required before granting access

---

## Permission Actions

### Standard Actions
- `read` - View/retrieve data
- `create` - Create new records
- `update` - Modify existing records
- `delete` - Remove records
- `print` - Generate printable output (specific to tirada)

### Wildcard
- `*` - All actions (root only)

---

## Resources

### Users (`users`)
User account management

**Actions:**
- `read` - View user profiles
- `create` - Register new users
- `update` - Modify user data
- `delete` - Remove users

### Roles (`roles`)
Role and permission management

**Actions:**
- `read` - View roles and permissions
- `create` - Create new roles
- `update` - Modify role permissions
- `delete` - Remove roles

### API Keys (`api_keys`)
API key management for service authentication

**Actions:**
- `read` - View API keys
- `create` - Generate new API keys
- `update` - Modify API key settings
- `delete` - Revoke API keys

### Data (`data`)
**Unified resource** encompassing tirada, socios, and cobrocuotas

This is a special consolidated resource that represents:
- **Tirada** - Fee collection records
- **Socios** - Member/partner data
- **Cobrocuotas** - Fee charges/dues

**Important:** These three data types are **inseparable** in the permission system. They always have identical permission levels within any role. When you check permissions for `tirada`, `socios`, or `cobrocuotas`, the system automatically maps them to the unified `data` resource.

**Actions:**
- `read` - View data (tirada, socios, cobrocuotas)
- `create` - Create new records
- `update` - Modify records
- `delete` - Remove records
- `print` - Generate printable output

---

## Upgrading User Roles

### From `new_user` to Active Role

**Root must manually upgrade users:**

```bash
# Using root endpoints (requires root JWT)
PATCH /api/root/users/:userId
{
  "role": "user"  # or "readonly", "printer"
}
```

**Recommended Workflow:**
1. User registers → Gets `new_user` role
2. Root reviews registration
3. Root assigns appropriate role based on user needs:
   - `admin_employee` - Administrative staff with full access to member/fee data
   - `library_employee` - Library staff with read and print access
4. User can now access the system

---

## Role Hierarchy (by access level)

```
root (System Protected)
  ↓ Full access to everything
admin_employee
  ↓ Full CRUD + print on library_associateds
library_employee
  ↓ Read + print on library_associateds
new_user
  ↓ No access (awaiting approval)
```

---

## Security Considerations

### System Role Protection
- `root` role has `is_system = TRUE`
- Cannot be modified or deleted via API
- Ensures at least one root always exists

### New User Security
- Default role prevents unauthorized access
- Requires active root approval
- Protects against mass registration attacks

### OAuth Users
- OAuth registrations also get `new_user` role
- Same approval process as password registrations
- Cannot self-assign privileged roles

### Role Assignment Restrictions
- Users cannot self-assign roles during registration
- Attempting to register with `root`, `admin_employee`, or `library_employee` role returns 403 Forbidden
- Only `new_user` role can be self-assigned (automatically)

---

## Checking Permissions

### In Code (Model Methods)

```javascript
// Check if user has specific permission
const canRead = await user.hasPermission('tirada', 'read');
const canPrint = await user.hasPermission('tirada', 'print');

// Check if user can access resource at all
const canAccessTirada = await user.canAccessResource('tirada');

// Get all permissions for a resource
const permissions = await user.getResourcePermissions('tirada');
// Returns: ['read', 'print']

// Check user role
const isRoot = await user.hasRole('root');
const roleName = await user.getRoleName();
```

### In Routes (Middleware)

```javascript
// Require specific role
router.get('/root-only',
  authenticateToken,
  authorizeRoles('root'),
  handler
);

// Allow multiple roles
router.get('/staff-area',
  authenticateToken,
  authorizeRoles('root', 'library_employee'),
  handler
);

// Check permissions manually in handler
router.get('/tirada/:id', authenticateToken, async (req, res) => {
  const canRead = await req.user.hasPermission('tirada', 'read');
  if (!canRead) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  // ... handle request
});
```

---

## Migration History

1. **Migration 001** - Created initial auth tables with ENUM roles
2. **Migration 003** - Migrated to roles table with ACL
3. **Migration 005** - Added `new_user` role for new registrations
4. **Migration 006** - Added `admin_employee` role
5. **Migration 007** - Renamed `user` to `library_employee`, `data` to `library_associateds`
6. **Migration 008** - 3NF normalization (resources + role_permissions tables)
7. **Migration 009** - Removed redundant permissions JSON column
8. **Migration 010** - Removed `printer` and `readonly` roles (printer apps use logged-in user credentials)

---

## Future Enhancements

Potential improvements to the role system:

1. **Custom Roles** - Allow admins to create custom roles
2. **Fine-grained Permissions** - Per-resource field-level permissions
3. **Role Templates** - Pre-configured role templates for common use cases
4. **Role Expiration** - Time-limited role assignments
5. **Multi-role Support** - Users can have multiple roles simultaneously
6. **Permission Inheritance** - Roles can inherit from other roles

---

## Support

For role and permission issues:
- Check user's current role: `GET /api/auth/me`
- View all roles: `GET /api/roles` (root only)
- Update user role: `PATCH /api/root/users/:id` (root only)

For more information, see:
- [CLAUDE.md](./CLAUDE.md) - Main documentation
- [USER_ROLES.md](./USER_ROLES.md) - User management guide
