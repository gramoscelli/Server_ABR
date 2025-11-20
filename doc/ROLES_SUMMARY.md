# Library System Roles - Quick Reference

## Role Structure Overview

The biblio-server has **4 roles** with clearly defined permissions:

| Role | Access Level | Library Associates Access | Description |
|------|-------------|-------------------|-------------|
| **root** | Full system | Full (wildcard) | System administrator |
| **admin_employee** | Administration dept | Read + Write | Can modify library data |
| **library_employee** | Library staff | Read + Print | Can view and print data |
| **new_user** | None | No access | New registrations awaiting approval |

---

## Library Associateds Resource

The `library_associateds` resource is a **unified resource** that encompasses library associates/members and their fee data. It includes three inseparable data types:

1. **`tirada`** - Fee collection records
2. **`socios`** - Library member/partner data
3. **`cobrocuotas`** - Fee charges and dues

**Important:** These three data types **cannot be separated**. They always have identical permission levels in any role. When checking permissions for `tirada`, `socios`, or `cobrocuotas`, the system automatically maps them to the unified `library_associateds` resource.

---

## Role Details

### 1. Root (`root`)
**System-protected role** - Cannot be modified or deleted

```json
{
  "*": ["*"]
}
```

- Wildcard permission grants full access to everything
- No need for specific resource permissions
- Can perform any action on any resource

**Use for:** System administrators, DevOps, Database administrators

---

### 2. Root Employee (`admin_employee`)
**Administration department employee** - Full access to library data (wildcard permissions)

```json
{
  "library_associateds": ["*"]
}
```

- Has **all permissions** on library_associateds resource (wildcard)
- Can create, read, update, delete, and print library member data
- Can create, read, update, delete, and print fee collection records
- Can create, read, update, delete, and print fee charges
- Can perform any current or future action on library data
- **Cannot** manage users, roles, or API keys

**Use for:**
- Administrative staff who manage member records
- Employees who handle fee collections and charges
- Staff responsible for data entry and corrections

---

### 3. Library Employee (`library_employee`)
**Library staff** - Read + print access to library associates data

```json
{
  "library_associateds": ["read", "print"]
}
```

- Can read library member data (socios)
- Can read fee collection records (tirada)
- Can read fee charges (cobrocuotas)
- Can **print** library associates data (printer applications will use the logged-in user's credentials)
- **Cannot** modify any data (no create/update/delete)
- **Cannot** access users, roles, or API keys

**Use for:**
- Library front desk staff
- Information desk employees
- Staff who need to view and print member information
- Printer applications (using Windows logged-in user credentials)

---

### 4. New User (`new_user`)
**Default role for new registrations** - No permissions

```json
{
  "library_associateds": []
}
```

- **No access** to any protected endpoints
- Can only login and change their own password
- Requires root to manually upgrade role

**Security rationale:**
- Prevents unauthorized access by default
- All new registrations (password or OAuth) start here
- Root must review and approve before granting access

---

## Permission Upgrade Workflow

1. User registers → Gets `new_user` role automatically
2. Root reviews the registration request
3. Root assigns appropriate role based on job function:
   - **Administration dept** → `admin_employee` (full CRUD + print)
   - **Library staff** → `library_employee` (read + print)
4. User can now access the system

### Upgrade command (root only):
```bash
PATCH /api/root/users/:userId
{
  "role": "library_employee"  # or "admin_employee"
}
```

---

## Quick Decision Guide

**Choose role based on what the user needs to do:**

| User needs to... | Assign role |
|-----------------|-------------|
| Modify member data, fees, charges | `admin_employee` |
| View and print member data (no changes) | `library_employee` |
| Full system administration | `root` |
| Just registered (pending approval) | `new_user` |

---

## Code Examples

### Checking permissions in routes:

```javascript
// Check if user can read library data
const canRead = await req.user.hasPermission('tirada', 'read');
const canRead = await req.user.hasPermission('socios', 'read');  // Same result
const canRead = await req.user.hasPermission('cobrocuotas', 'read');  // Same result

// Check if user can modify library data
const canUpdate = await req.user.hasPermission('tirada', 'update');

// Restrict endpoint to specific roles
router.get('/root-only',
  authenticateToken,
  authorizeRoles('root'),
  handler
);

router.post('/data-entry',
  authenticateToken,
  authorizeRoles('root', 'admin_employee'),
  handler
);
```

---

## Migration History

1. **Migration 001** - Created initial auth tables with ENUM roles
2. **Migration 003** - Migrated to roles table with ACL
3. **Migration 005** - Added `new_user` role for new registrations
4. **Migration 006** - Added `admin_employee` role and unified library data resources
5. **Migration 007** - Renamed `user` to `library_employee` and `data` to `library_associateds` for clarity
6. **Migration 008** - 3NF normalization (resources + role_permissions tables)
7. **Migration 009** - Removed redundant permissions JSON column
8. **Migration 010** - Removed `printer` and `readonly` roles (printer apps use logged-in user credentials)
9. **Migration 011** - Changed `admin_employee` to use wildcard `["*"]` permissions on library_associateds

---

## See Also

- [ROLE_PERMISSIONS.md](./ROLE_PERMISSIONS.md) - Comprehensive permission documentation
- [CLAUDE.md](./CLAUDE.md) - Main project documentation
- [USER_ROLES.md](./USER_ROLES.md) - User management guide
