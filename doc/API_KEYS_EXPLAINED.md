# API Keys - Complete Guide

## What are API Keys?

API keys are **long-lived authentication tokens** designed for **service-to-service** or **machine-to-machine** communication. Unlike JWT tokens that expire after 1 hour, API keys remain valid indefinitely (or until a set expiration date) and are ideal for automated systems, scripts, or external applications that need persistent access to the API.

---

## JWT vs API Keys - When to Use Each

### JWT Tokens (User Authentication)

**Use for**: Human users, web applications, mobile apps

**Characteristics**:
- ✅ Short-lived (1 hour access token, 7 days refresh token)
- ✅ Requires login with username/password
- ✅ Automatically expires for security
- ✅ Can be refreshed without re-login
- ✅ User-specific session management

**Example Use Cases**:
- Web application login
- Mobile app authentication
- Interactive user sessions
- OAuth social login

### API Keys (Service Authentication)

**Use for**: Automated systems, scripts, external services

**Characteristics**:
- ✅ Long-lived (never expires unless set)
- ✅ No login required - just send the key
- ✅ Static credential (doesn't change)
- ✅ Can be revoked/deleted at any time
- ✅ Associated with a user account and inherits its permissions

**Example Use Cases**:
- **Automated scripts** running on servers
- **Cron jobs** that query data periodically
- **Third-party integrations** (e.g., reporting tools)
- **Microservices** that need to communicate with the API
- **Command-line tools** that access the API
- **IoT devices** that send/receive data

---

## How API Keys Work

### 1. Architecture

```
┌─────────────────┐
│  External App   │ (e.g., Python script, microservice)
│  or Script      │
└────────┬────────┘
         │
         │ HTTP Request with:
         │ Header: X-API-Key: abc123...xyz789
         │
         ▼
┌─────────────────┐
│  biblio-server  │
│  API            │
├─────────────────┤
│ 1. Hash API key │ (SHA-256)
│ 2. Lookup in DB │ (api_keys table)
│ 3. Check valid? │ (active, not expired)
│ 4. Load user    │ (associated user_id)
│ 5. Check perms  │ (user's role permissions)
│ 6. Allow/Deny   │
└─────────────────┘
```

### 2. Storage & Security

**Client Side** (Your application):
- Stores the **plain API key** (e.g., `a1b2c3d4e5f6...`)
- Sends it in the `X-API-Key` header

**Server Side** (biblio-server):
- Stores only the **SHA-256 hash** of the key
- Never stores the plain key (same principle as passwords)
- Cannot recover the original key (one-way hash)

**Why this matters**:
- If the database is compromised, attackers cannot use the hashed keys
- Keys must be saved immediately when created (shown only once)

### 3. Authentication Flow

```javascript
// 1. Client sends request
GET /api/tirada/start/1/end/10
Headers:
  X-API-Key: a1b2c3d4e5f6789...

// 2. Server receives request
→ Hashes the key: SHA256('a1b2c3d4e5f6789...') = '9f86d081884c7d65...'
→ Looks up hash in api_keys table
→ Finds match: id=5, user_id=10, active=true, expires_at=null

// 3. Server loads associated user
→ Queries user_id=10 from usuarios table
→ Gets: username='script_user', role_id=2
→ Loads role: name='library_employee', permissions=['read', 'print']

// 4. Server checks permissions
→ Endpoint requires: 'read' on 'library_associateds'
→ User has: 'read' permission ✓
→ Request ALLOWED

// 5. Server updates last_used timestamp
→ UPDATE api_keys SET last_used=NOW() WHERE id=5

// 6. Server returns data
→ Status: 200 OK
→ Body: [array of tirada records]
```

---

## Creating and Managing API Keys

### Prerequisites

- Must be authenticated as **root** (admin)
- Only root can create, revoke, or delete API keys

### Creating an API Key

**Endpoint**: `POST /api/api-keys`

**Request**:
```bash
# 1. Login as root to get JWT token
CSRF=$(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')
LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"username": "root", "password": "admin123"}')

TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')

# 2. Create API key for a specific user
curl -X POST http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "name": "Data Sync Script",
    "userId": 10,
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

**Response**:
```json
{
  "message": "API key created successfully",
  "apiKey": "a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789",
  "id": 5,
  "warning": "Save this API key now. You will not be able to see it again!"
}
```

**⚠️ CRITICAL**: The `apiKey` value is shown **only once**. Save it immediately!

**Parameters**:
- `name` (required): Descriptive name for the key (e.g., "Backup Script", "Reporting Tool")
- `userId` (optional): User ID to associate the key with (inherits that user's permissions)
- `expiresAt` (optional): ISO date string for expiration (e.g., "2026-12-31T23:59:59Z")

### Listing API Keys

**Endpoint**: `GET /api/api-keys`

```bash
# List all API keys
curl http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer $ROOT_TOKEN"

# Filter by user
curl http://localhost:3000/api/api-keys?userId=10 \
  -H "Authorization: Bearer $ROOT_TOKEN"
```

**Response**:
```json
{
  "apiKeys": [
    {
      "id": 5,
      "name": "Data Sync Script",
      "user_id": 10,
      "active": true,
      "created_at": "2025-11-08T10:30:00Z",
      "expires_at": "2026-12-31T23:59:59Z",
      "last_used": "2025-11-08T12:45:30Z"
    }
  ]
}
```

**Note**: The actual API key is **never** returned (only the hash is stored).

### Revoking an API Key

**Endpoint**: `PATCH /api/api-keys/:id/revoke`

Revokes (deactivates) a key without deleting it from the database.

```bash
curl -X PATCH http://localhost:3000/api/api-keys/5/revoke \
  -H "Authorization: Bearer $ROOT_TOKEN" \
  -H "X-CSRF-Token: $CSRF"
```

**Response**:
```json
{
  "message": "API key revoked successfully"
}
```

**Effect**: Sets `active=false` in the database. The key can no longer be used for authentication.

### Deleting an API Key

**Endpoint**: `DELETE /api/api-keys/:id`

Permanently deletes the key from the database.

```bash
curl -X DELETE http://localhost:3000/api/api-keys/5 \
  -H "Authorization: Bearer $ROOT_TOKEN" \
  -H "X-CSRF-Token: $CSRF"
```

**Response**:
```json
{
  "message": "API key deleted successfully"
}
```

---

## Using API Keys

### Basic Usage

Send the API key in the `X-API-Key` header:

```bash
curl http://localhost:3000/api/tirada/start/1/end/10 \
  -H "X-API-Key: a1b2c3d4e5f6789abcdef0123456789..."
```

### Supported Endpoints

Currently, only the **tirada** endpoint supports API key authentication:

```javascript
// In app/app.js
app.use('/api/tirada', apiLimiter, authenticateEither, tiradascob);
```

The `authenticateEither` middleware accepts:
1. **API Key** (via `X-API-Key` header) - checked first
2. **JWT Token** (via `Authorization: Bearer` header) - fallback

**Why limited support?**
- State-changing operations (POST, PUT, DELETE) require CSRF tokens
- CSRF tokens are session-based and don't work well with static API keys
- API keys are best for read-only or idempotent operations

### Example: Python Script

```python
import requests

API_KEY = "a1b2c3d4e5f6789abcdef0123456789..."
BASE_URL = "http://localhost:3000"

# Fetch fee collection records
response = requests.get(
    f"{BASE_URL}/api/tirada/start/1/end/100",
    headers={"X-API-Key": API_KEY}
)

if response.status_code == 200:
    data = response.json()
    print(f"Retrieved {len(data)} records")
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

### Example: Bash Cron Job

```bash
#!/bin/bash
# Backup script that runs daily at 2 AM

API_KEY="a1b2c3d4e5f6789abcdef0123456789..."
API_URL="http://localhost:3000/api/tirada/start/1/end/10000"

# Fetch data and save to file
curl -s "$API_URL" \
  -H "X-API-Key: $API_KEY" \
  -o "/backups/tirada_$(date +%Y%m%d).json"

echo "Backup completed: $(date)"
```

---

## Permissions & Security

### Permission Inheritance

API keys **inherit the permissions of the associated user**:

1. **Create API key for user_id=10**
2. User 10 has role: `library_employee`
3. Role permissions: `["read", "print"]` on `library_associateds`
4. **API key has same permissions**: Can read/print, cannot create/update/delete

**Example Scenarios**:

| User Role | Permissions | What API Key Can Do |
|-----------|-------------|---------------------|
| `root` | `*:["*"]` | Everything (not recommended for API keys!) |
| `admin_employee` | `library_associateds:["*"]` | Full CRUD on library data |
| `library_employee` | `library_associateds:["read", "print"]` | Read and print only |
| `new_user` | None | Nothing (API key will be rejected) |

### Security Best Practices

1. **Principle of Least Privilege**:
   - Create a dedicated user account for the API key
   - Assign only the minimum required permissions
   - Don't use root API keys for automated scripts

2. **Rotation**:
   - Set expiration dates on API keys
   - Rotate keys periodically (every 6-12 months)
   - Revoke old keys after rotation

3. **Monitoring**:
   - Check `last_used` timestamps regularly
   - Revoke unused keys
   - Monitor for suspicious activity

4. **Storage**:
   - Never commit API keys to Git repositories
   - Store keys in environment variables or secure vaults
   - Use `.env` files (excluded from Git)

5. **Scope Limitation**:
   - Create different API keys for different services
   - Easier to revoke if one service is compromised
   - Better audit trail

---

## Database Schema

**Table**: `api_keys`

```sql
CREATE TABLE api_keys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash (never the plain key!)
  name VARCHAR(100) NOT NULL,             -- Descriptive name
  user_id INT,                            -- Associated user (optional)
  active BOOLEAN DEFAULT TRUE,            -- Can be revoked
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL,              -- Optional expiration
  last_used TIMESTAMP NULL,               -- Updated on each use

  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_key_hash (key_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_active (active)
);
```

**Key Fields**:
- `key_hash`: SHA-256 hash of the API key (64 hex characters)
- `active`: Set to `false` to revoke without deleting
- `expires_at`: Automatic expiration (checked on every request)
- `last_used`: Helps identify inactive keys

---

## Common Use Cases

### 1. Automated Data Sync

**Scenario**: Nightly sync of library data to a reporting database

**Setup**:
```bash
# Create dedicated user
POST /api/auth/register
{
  "username": "data_sync_service",
  "password": "strong_password_here",
  "email": "sysadmin@library.org"
}

# Root upgrades user to library_employee role
PATCH /api/root/users/{userId}
{
  "role": "library_employee"
}

# Root creates API key for this user
POST /api/api-keys
{
  "name": "Nightly Data Sync",
  "userId": {userId},
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

**Usage**: Cron job runs Python script with API key to fetch data

### 2. Third-Party Integration

**Scenario**: External analytics platform needs read access

**Setup**:
- Create user: `analytics_platform`
- Assign role: `library_employee` (read-only)
- Create API key: "Analytics Platform Integration"
- Provide API key to vendor (securely)

**Security**: If integration is compromised, revoke only that API key

### 3. Mobile App Backend

**Scenario**: Mobile app backend service needs to query library data

**Setup**:
- Create user: `mobile_backend`
- Assign role: `library_employee`
- Create API key: "Mobile App Backend Service"
- Deploy API key in backend server environment variables

**Why API key instead of JWT**: Backend service runs 24/7, doesn't need session management

### 4. Testing & Development

**Scenario**: Developers need to test API integration

**Setup**:
- Create user: `dev_testing`
- Assign role: `library_employee` (safe permissions)
- Create temporary API key with near-term expiration
- Share in team password manager

**Best Practice**: Use expiring keys for testing, revoke after project completion

---

## Troubleshooting

### Error: "API key required"

**Cause**: Missing `X-API-Key` header

**Solution**:
```bash
# Wrong
curl http://localhost:3000/api/tirada/start/1/end/10

# Correct
curl http://localhost:3000/api/tirada/start/1/end/10 \
  -H "X-API-Key: your-key-here"
```

### Error: "Invalid API key"

**Causes**:
1. Wrong API key value
2. API key has been revoked (`active=false`)
3. API key has expired
4. API key not in database

**Solution**:
```bash
# Check if key is active
GET /api/api-keys  # (as root)

# Revoked? Delete and create new one
DELETE /api/api-keys/{id}
POST /api/api-keys { ... }
```

### Error: "Insufficient permissions"

**Cause**: Associated user doesn't have required permissions

**Solution**: Upgrade user's role or create new user with correct role

### Last Used Not Updating

**Cause**: System error or database issue

**Check**: Look at application logs (`docker logs nodejs`)

---

## Migration Notes

API keys were added in **Migration 001** (`001_create_auth_tables.sql`).

To add API key support to additional endpoints, use the `authenticateEither` middleware:

```javascript
// app/app.js
const authenticateEither = require('./middleware/authenticateEither');

// Allow both JWT and API key authentication
app.use('/api/your-endpoint', apiLimiter, authenticateEither, yourRouter);
```

---

## See Also

- [CLAUDE.md](./CLAUDE.md) - Main documentation (Authentication section)
- [SETUP_AUTH.md](./SETUP_AUTH.md) - Authentication setup guide
- [ROLE_PERMISSIONS.md](./ROLE_PERMISSIONS.md) - Permission system details

---

**Last Updated**: 2025-11-08
**Feature Status**: ✅ Production Ready
**Current Limitation**: Only `/api/tirada` endpoint supports API keys
