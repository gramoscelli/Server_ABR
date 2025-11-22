# User Roles System Documentation

## Overview

The biblio-server implements a comprehensive role-based access control (RBAC) system with three predefined roles: **admin**, **user**, and **readonly**.

---

## Available Roles

### 1. Admin
- **Full system access**
- Can manage users, roles, and API keys
- Can access all endpoints
- Can promote/demote other users
- Cannot demote themselves (safety measure)
- Cannot remove the last admin (safety measure)

**Permissions:**
- `user_management`
- `role_management`
- `api_key_management`
- `system_settings`
- `read_all`
- `write_all`
- `delete_all`

### 2. User (Default)
- **Standard user access**
- Can access protected resources
- Can manage their own data
- Cannot manage other users

**Permissions:**
- `read_own_data`
- `write_own_data`
- `read_public`

### 3. Readonly
- **Read-only access**
- Can view but not modify resources
- Limited to viewing their own data

**Permissions:**
- `read_own_data`
- `read_public`

---

## API Endpoints

### Public Endpoints

#### Get Available Roles
```http
GET /api/roles
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "roles": [
    {
      "name": "admin",
      "description": "Full system access...",
      "permissions": ["user_management", "role_management", ...]
    },
    {
      "name": "user",
      "description": "Standard user access...",
      "permissions": ["read_own_data", "write_own_data", ...]
    },
    {
      "name": "readonly",
      "description": "Read-only access...",
      "permissions": ["read_own_data", "read_public"]
    }
  ]
}
```

### Admin-Only Endpoints

#### Get Role Statistics
```http
GET /api/roles/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "total_users": 10,
  "by_role": {
    "admin": {
      "count": 2,
      "percentage": "20.00"
    },
    "user": {
      "count": 7,
      "percentage": "70.00"
    },
    "readonly": {
      "count": 1,
      "percentage": "10.00"
    }
  }
}
```

#### Update User Role
```http
PUT /api/roles/user/:userId
Authorization: Bearer <admin_token>
X-CSRF-Token: <csrf_token>
Content-Type: application/json

{
  "role": "admin"
}
```

**Response:**
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": 5,
    "username": "john_doe",
    "email": "john@example.com",
    "old_role": "user",
    "new_role": "admin"
  }
}
```

#### Get Users by Role
```http
GET /api/roles/users/:role
Authorization: Bearer <admin_token>
```

**Example:** `GET /api/roles/users/admin`

**Response:**
```json
{
  "role": "admin",
  "count": 2,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "is_active": true,
      "last_login": "2025-11-06T18:00:00.000Z",
      "created_at": "2025-11-01T10:00:00.000Z"
    }
  ]
}
```

#### Promote User to Admin
```http
POST /api/roles/promote/:userId
Authorization: Bearer <admin_token>
X-CSRF-Token: <csrf_token>
```

**Response:**
```json
{
  "message": "User promoted to administrator",
  "user": {
    "id": 5,
    "username": "john_doe",
    "email": "john@example.com",
    "old_role": "user",
    "new_role": "admin"
  }
}
```

#### Demote Admin to User
```http
POST /api/roles/demote/:userId
Authorization: Bearer <admin_token>
X-CSRF-Token: <csrf_token>
```

**Response:**
```json
{
  "message": "Administrator demoted to user",
  "user": {
    "id": 5,
    "username": "john_doe",
    "email": "john@example.com",
    "old_role": "admin",
    "new_role": "user"
  }
}
```

---

## Safety Features

### 1. Self-Protection
- Admins cannot modify their own role
- Prevents accidental lockout

### 2. Last Admin Protection
- Cannot demote the last admin
- System always has at least one administrator

### 3. CSRF Protection
- All role-changing operations require CSRF tokens
- Prevents cross-site request forgery attacks

### 4. Authentication Required
- All endpoints require valid JWT tokens
- Role changes require admin privileges

---

## Creating Admin Users

### Method 1: Using the Script

```bash
# Inside the Docker container
docker compose exec backend node scripts/create_admin_user.js <username> <password> [email]

# Example
docker compose exec backend node scripts/create_admin_user.js admin SecurePass123! admin@example.com
```

### Method 2: Direct Database Update

```sql
-- Update existing user to admin
UPDATE usuarios SET role = 'admin' WHERE username = 'your_username';
```

### Method 3: Via API (requires existing admin)

```bash
# Get CSRF token
CSRF_TOKEN=$(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')

# Login as admin
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"username":"admin","password":"your_password"}' \
  | jq -r '.accessToken')

# Promote user ID 5 to admin
curl -X POST http://localhost:3000/api/roles/promote/5 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN"
```

---

## Usage Examples

### Example 1: Check Your Role

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"username":"john","password":"pass123"}'

# Response includes role
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": 5,
    "username": "john",
    "role": "user"  # <-- Your role
  }
}
```

### Example 2: List All Admins

```bash
curl http://localhost:3000/api/roles/users/admin \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Example 3: Change User Role

```bash
# Get CSRF token
CSRF_TOKEN=$(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')

# Change role
curl -X PUT http://localhost:3000/api/roles/user/5 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"readonly"}'
```

### Example 4: Get Role Statistics

```bash
curl http://localhost:3000/api/roles/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Middleware Usage

### Protecting Routes by Role

```javascript
const { authenticateToken, authorizeRoles } = require('./middleware/auth');

// Admin-only route
router.get('/admin/dashboard',
  authenticateToken,
  authorizeRoles('admin'),
  (req, res) => {
    res.json({ message: 'Admin dashboard' });
  }
);

// Admin or User route
router.get('/dashboard',
  authenticateToken,
  authorizeRoles('admin', 'user'),
  (req, res) => {
    res.json({ message: 'User dashboard' });
  }
);

// Any authenticated user
router.get('/profile',
  authenticateToken,
  (req, res) => {
    res.json({ user: req.user });
  }
);
```

---

## Database Schema

```sql
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  role VARCHAR(20) DEFAULT 'user',  -- 'admin', 'user', 'readonly'
  is_active BOOLEAN DEFAULT TRUE,
  failed_attempts INT DEFAULT 0,
  locked_until DATETIME,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "You must be authenticated to access this resource"
}
```

### 403 Forbidden (Insufficient Permissions)
```json
{
  "error": "Insufficient permissions",
  "message": "You do not have permission to access this resource. Required role: admin"
}
```

### 403 Forbidden (Cannot Modify Self)
```json
{
  "error": "Cannot modify own role",
  "message": "You cannot change your own role. Ask another administrator."
}
```

### 403 Forbidden (Last Admin)
```json
{
  "error": "Cannot demote last admin",
  "message": "Cannot demote the last administrator. Promote another user first."
}
```

### 400 Bad Request (Invalid Role)
```json
{
  "error": "Invalid role",
  "message": "Role must be one of: admin, user, readonly"
}
```

---

## Security Considerations

1. **JWT Tokens**: All role information is embedded in JWT tokens
2. **CSRF Protection**: All role-changing operations require CSRF tokens
3. **Rate Limiting**: API endpoints are rate-limited (1 minute window)
4. **Password Requirements**: Minimum 8 characters
5. **Account Lockout**: 5 failed attempts lock account for 30 minutes
6. **Audit Trail**: All role changes should be logged (implement if needed)

---

## Testing

### Test Script Location
- Main test script: `/home/gustavo/biblio-server/test_app_API.sh`
- Run tests: `./test_app_API.sh`

### Manual Testing

1. **Create admin user:**
   ```bash
   docker compose exec backend node scripts/create_admin_user.js admin Pass123! admin@test.com
   ```

2. **Create regular user:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -H "X-CSRF-Token: $CSRF_TOKEN" \
     -d '{"username":"testuser","password":"Pass123!","email":"test@test.com"}'
   ```

3. **Test role endpoints as admin** (see examples above)

---

## Files Created/Modified

### New Files:
- `app/routes/roles.js` - Role management endpoints
- `app/scripts/create_admin_user.js` - Admin creation script

### Modified Files:
- `app/app.js` - Added roles router
- `app/models/User.js` - Role ENUM definition
- `app/middleware/auth.js` - authorizeRoles middleware (already existed)

---

## Current Users

Check current users and roles:
```bash
docker compose exec db mysql -uroot -pabr2005 abr -e "SELECT id, username, email, role, is_active FROM usuarios;"
```

---

**Last Updated:** 2025-11-06
**Version:** 1.0
**Maintainer:** Development Team
