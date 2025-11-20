# User Roles - Quick Start Guide

## 🚀 Quick Commands

### Create Admin User
```bash
docker compose exec app node scripts/create_admin_user.js admin YourPassword123! admin@example.com
```

### Promote Existing User to Admin
```bash
# Method 1: Direct database update
docker compose exec db mysql -uroot -pabr2005 abr -e "UPDATE usuarios SET role = 'admin' WHERE username = 'your_username';"

# Method 2: Via API (requires existing admin)
curl -X POST http://localhost:3000/api/roles/promote/USER_ID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"
```

### View All Users and Roles
```bash
docker compose exec db mysql -uroot -pabr2005 abr -e "SELECT id, username, email, role, is_active FROM usuarios;"
```

---

## 📋 Available Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **admin** | Full system access | Manage users, roles, API keys, all resources |
| **user** | Standard access | Read/write own data, access protected endpoints |
| **readonly** | View-only access | Read own data, no modifications |

---

## 🔐 API Endpoints

### For Everyone (Authenticated)
- `GET /api/roles` - List available roles

### Admin Only
- `GET /api/roles/stats` - Role statistics
- `GET /api/roles/users/:role` - List users by role
- `PUT /api/roles/user/:userId` - Change user role
- `POST /api/roles/promote/:userId` - Promote to admin
- `POST /api/roles/demote/:userId` - Demote from admin

---

## 💡 Common Tasks

### 1. Login and Check Your Role
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')" \
  -d '{"username":"admin","password":"YourPassword123!"}' \
  | jq -r '.accessToken')

# Your role is in the JWT token payload
```

### 2. Get Role Statistics (Admin)
```bash
curl http://localhost:3000/api/roles/stats \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 3. List All Admins (Admin)
```bash
curl http://localhost:3000/api/roles/users/admin \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 4. Change User Role (Admin)
```bash
CSRF=$(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')

curl -X PUT http://localhost:3000/api/roles/user/5 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"role":"readonly"}' | jq
```

---

## ⚠️ Safety Features

- ✅ Cannot change your own role
- ✅ Cannot remove the last admin
- ✅ All changes require CSRF tokens
- ✅ All changes require admin authentication

---

## 📁 Files

- **Routes**: `app/routes/roles.js`
- **Middleware**: `app/middleware/auth.js` (authorizeRoles)
- **Scripts**: `app/scripts/create_admin_user.js`
- **Full Docs**: `USER_ROLES.md`

---

**Need help?** See `USER_ROLES.md` for complete documentation.
