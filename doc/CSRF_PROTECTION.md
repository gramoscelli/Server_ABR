# CSRF Protection Documentation

**Date:** 2025-11-06
**Status:** ✅ FULLY IMPLEMENTED

This document explains the CSRF (Cross-Site Request Forgery) protection implemented in the biblio-server API using the **Synchronizer Token Pattern**.

---

## 🛡️ What is CSRF?

**Cross-Site Request Forgery (CSRF)** is an attack that tricks a user's browser into making unwanted requests to a web application where they're authenticated.

**Example Attack:**
```html
<!-- Malicious website -->
<img src="https://yourapi.com/api/admin/users/5/delete" />
<!-- Browser automatically sends cookies/credentials -->
```

---

## 🔒 Protection Strategy

We implement **defense in depth** with multiple layers:

### Layer 1: JWT in Authorization Header (Primary)
- ✅ JWT tokens in `Authorization: Bearer` header
- ✅ Browsers don't automatically send custom headers
- ✅ Immune to classic CSRF attacks

### Layer 2: CSRF Tokens (Defense in Depth)
- ✅ Synchronizer token pattern
- ✅ Protects against future cookie-based auth
- ✅ Protects if JWT is ever moved to cookies
- ✅ Additional XSS protection

### Layer 3: CORS Configuration
- ✅ Strict origin whitelist
- ✅ Blocks unauthorized domains
- ✅ Credential-aware CORS

---

## 📋 How It Works

### 1. Client Requests a CSRF Token

**Request:**
```bash
GET /api/csrf-token
```

**Response:**
```json
{
  "csrfToken": "a1b2c3d4e5f6...64-char-hex-string",
  "expiresAt": "2025-11-06T17:00:00.000Z",
  "expiresIn": 7200
}
```

**Token Details:**
- 64-character hexadecimal string (256-bit entropy)
- Stored in database with expiration
- Optionally associated with user ID and IP
- Expires after 2 hours (configurable)

---

### 2. Client Includes Token in Requests

For **state-changing operations** (POST, PUT, DELETE, PATCH):

**Request:**
```bash
POST /api/auth/login
X-CSRF-Token: a1b2c3d4e5f6...64-char-hex-string
Content-Type: application/json

{
  "username": "admin",
  "password": "secure_password"
}
```

**Headers Required:**
- `X-CSRF-Token: <token>` - The CSRF token
- `Authorization: Bearer <jwt>` - For protected endpoints

---

### 3. Server Validates Token

**Validation Steps:**
1. ✅ Extract token from `X-CSRF-Token` header
2. ✅ Validate token format (64-char hex)
3. ✅ Query token from database
4. ✅ Check token exists
5. ✅ Check token not expired
6. ✅ Check token not already used (if single-use mode)
7. ✅ Optional: Verify user ID matches
8. ✅ Optional: Verify IP matches
9. ✅ Allow request to proceed

**If validation fails:**
```json
{
  "error": "CSRF token missing/invalid/expired",
  "message": "CSRF token is required. Include X-CSRF-Token header.",
  "hint": "Get a token from GET /api/csrf-token"
}
```

---

## 🎯 Protected Endpoints

### Endpoints Requiring CSRF Token:

| Method | Endpoint | CSRF Required | Reason |
|--------|----------|---------------|---------|
| POST | `/api/auth/login` | ✅ Yes | State change |
| POST | `/api/auth/register` | ✅ Yes | State change |
| POST | `/api/auth/logout` | ✅ Yes | State change |
| POST | `/api/auth/change-password` | ✅ Yes | State change |
| POST | `/api/api-keys` | ✅ Yes | State change |
| DELETE | `/api/api-keys/:id` | ✅ Yes | State change |
| POST | `/api/admin/users/:id/unlock` | ✅ Yes | State change |
| PATCH | `/api/admin/users/:id/reset-attempts` | ✅ Yes | State change |

### Endpoints NOT Requiring CSRF Token:

| Method | Endpoint | CSRF Required | Reason |
|--------|----------|---------------|---------|
| GET | `/api/csrf-token` | ❌ No | Token generation |
| GET | `/api/auth/me` | ❌ No | Read-only |
| GET | `/api/tirada/*` | ❌ No | Read-only |
| GET | `/api/admin/users` | ❌ No | Read-only |
| GET | `/api/csrf/stats` | ❌ No | Read-only |

**Rule:** CSRF validation automatically skips safe methods (GET, HEAD, OPTIONS)

---

## 🔧 Configuration

### Token Settings (in `app/middleware/csrf.js`):

```javascript
const CSRF_TOKEN_LENGTH = 32; // bytes (64 hex chars)
const CSRF_TOKEN_EXPIRY_HOURS = 2; // Token expires after 2 hours
const SINGLE_USE_TOKENS = false; // One-time use tokens (more secure, less UX)
```

### Adjust Based on Your Needs:

| Use Case | Token Expiry | Single-Use |
|----------|--------------|------------|
| High-security banking | 15 minutes | true |
| **Standard API (current)** | **2 hours** | **false** |
| Long-running sessions | 24 hours | false |
| Public forms | 6 hours | true |

---

## 📊 Database Schema

### CSRF Tokens Table:

```sql
CREATE TABLE csrf_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(128) NOT NULL UNIQUE,
  user_id INT NULL,                    -- Optional: associate with user
  ip_address VARCHAR(45) NULL,         -- Optional: associate with IP
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,          -- Track if used (single-use mode)
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
);
```

### Automatic Cleanup:

Database event runs **daily at 3 AM** to clean up expired tokens:

```sql
CREATE EVENT cleanup_expired_csrf_tokens
ON SCHEDULE EVERY 1 DAY
DO
  DELETE FROM csrf_tokens
  WHERE expires_at < NOW()
  OR (used = TRUE AND created_at < NOW() - INTERVAL 1 HOUR);
```

---

## 🚀 Usage Examples

### Example 1: Login Flow (SPA/Mobile App)

```javascript
// Step 1: Get CSRF token
const csrfResponse = await fetch('https://api.example.com/api/csrf-token');
const { csrfToken } = await csrfResponse.json();

// Step 2: Login with CSRF token
const loginResponse = await fetch('https://api.example.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'password123'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();

// Step 3: Use JWT for subsequent requests
const dataResponse = await fetch('https://api.example.com/api/tirada/start/1/end/10', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
    // No CSRF token needed for GET requests
  }
});
```

---

### Example 2: Create API Key (Admin)

```javascript
// Step 1: Get CSRF token
const csrfResponse = await fetch('https://api.example.com/api/csrf-token');
const { csrfToken } = await csrfResponse.json();

// Step 2: Create API key with both JWT and CSRF token
const response = await fetch('https://api.example.com/api/api-keys', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminJwtToken}`,
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'External Service',
    expiresAt: '2026-12-31T23:59:59Z'
  })
});
```

---

### Example 3: Unlock User Account (Admin)

```bash
# Get CSRF token
CSRF_TOKEN=$(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')

# Unlock account
curl -X POST http://localhost:3000/api/admin/users/5/unlock \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "X-CSRF-Token: $CSRF_TOKEN"
```

---

## 👨‍💼 Admin Management

### View CSRF Statistics

```bash
GET /api/csrf/stats

curl http://localhost:3000/api/csrf/stats \
  -H "Authorization: Bearer $ADMIN_JWT"
```

**Response:**
```json
{
  "total_tokens": 150,
  "used_tokens": 45,
  "expired_tokens": 30,
  "active_tokens": 75,
  "config": {
    "token_expiry_hours": 2,
    "single_use_tokens": false
  }
}
```

### Manual Token Cleanup

```bash
POST /api/csrf/cleanup

curl -X POST http://localhost:3000/api/csrf/cleanup \
  -H "Authorization: Bearer $ADMIN_JWT"
```

**Response:**
```json
{
  "message": "CSRF token cleanup completed",
  "deleted_count": 30
}
```

---

## 🔍 Security Features

### 1. Cryptographically Secure Tokens
- ✅ Uses `crypto.randomBytes()` (not `Math.random()`)
- ✅ 256-bit entropy (64 hex characters)
- ✅ Unpredictable and unforgeable

### 2. Token Association (Optional)
```javascript
// Token can be associated with:
- user_id: Token only valid for specific user
- ip_address: Token only valid from same IP
```

### 3. Time-Limited Validity
- ✅ Tokens expire after 2 hours
- ✅ Automatic cleanup of expired tokens
- ✅ Cannot be reused after expiration

### 4. Single-Use Mode (Optional)
```javascript
const SINGLE_USE_TOKENS = true; // Enable one-time use
```
- ✅ Token marked as "used" after first request
- ✅ Cannot be replayed
- ✅ Higher security but requires new token for each request

### 5. Format Validation
- ✅ Validates token is exactly 64 hex characters
- ✅ Rejects malformed tokens immediately
- ✅ Prevents injection attacks

---

## 🧪 Testing

### Test 1: Get CSRF Token

```bash
curl http://localhost:3000/api/csrf-token
```

**Expected:**
```json
{
  "csrfToken": "a1b2c3...",
  "expiresAt": "2025-11-06T17:00:00.000Z",
  "expiresIn": 7200
}
```

---

### Test 2: Request Without CSRF Token (Should Fail)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}'
```

**Expected:**
```json
{
  "error": "CSRF token missing",
  "message": "CSRF token is required. Include X-CSRF-Token header.",
  "hint": "Get a token from GET /api/csrf-token"
}
```

---

### Test 3: Request With Valid CSRF Token (Should Succeed)

```bash
# Get token
TOKEN=$(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')

# Use token
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"username":"test","password":"password123"}'
```

**Expected:**
```json
{
  "message": "User created successfully",
  "userId": 5
}
```

---

### Test 4: Request With Expired Token (Should Fail)

```bash
# Use an old/expired token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: expired_token_here" \
  -d '{"username":"admin","password":"password"}'
```

**Expected:**
```json
{
  "error": "Invalid CSRF token",
  "message": "CSRF token is invalid or has expired"
}
```

---

### Test 5: GET Request Without Token (Should Succeed)

```bash
# GET requests don't need CSRF tokens
curl http://localhost:3000/api/tirada/start/1/end/10 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected:** Normal response (CSRF validation skipped for safe methods)

---

## 📁 Files Created/Modified

### Created:
1. ✅ `migrations/003_create_csrf_tokens.sql` - Database schema
2. ✅ `app/middleware/csrf.js` - CSRF middleware (260 lines)
3. ✅ `app/routes/csrf.js` - Admin management endpoints
4. ✅ `CSRF_PROTECTION.md` - This documentation

### Modified:
1. ✅ `app/app.js` - Added CSRF validation to endpoints
2. ✅ Removed `app/routes/genCSRF.js` - Old broken implementation

---

## 🚀 Deployment Steps

### 1. Apply Database Migration

```bash
docker exec -it mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < migrations/003_create_csrf_tokens.sql
```

### 2. Restart Application

```bash
docker-compose restart app
```

### 3. Verify CSRF Protection

```bash
# Test token generation
curl http://localhost:3000/api/csrf-token

# Test token validation (should fail without token)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123456"}'

# Should see: "CSRF token missing" error
```

---

## ⚠️ Important Notes

### For Frontend Developers:

1. **Always get CSRF token first** for state-changing operations
2. **Include token in `X-CSRF-Token` header** for POST/PUT/DELETE
3. **GET requests don't need CSRF tokens**
4. **Tokens expire after 2 hours** - handle 403 errors and refresh
5. **One token can be used multiple times** (unless single-use mode)

### For Backend Developers:

1. **Safe methods (GET, HEAD, OPTIONS) skip CSRF validation** automatically
2. **Validation is middleware-based** - easy to enable/disable per route
3. **Tokens are database-backed** for distributed systems
4. **Automatic cleanup** via MySQL event (daily at 3 AM)
5. **Optional user/IP binding** for extra security

### For Security Auditors:

1. ✅ **Cryptographically secure tokens** (crypto.randomBytes)
2. ✅ **Synchronizer token pattern** (OWASP recommended)
3. ✅ **Time-limited validity** (2 hours)
4. ✅ **Format validation** (prevents injection)
5. ✅ **Database-backed** (survives server restarts)
6. ✅ **Optional single-use mode** (replay protection)
7. ✅ **Defense in depth** (works alongside JWT)

---

## 🔜 Advanced Features (Optional)

Consider enabling these for higher security:

### 1. Single-Use Tokens
```javascript
// In app/middleware/csrf.js
const SINGLE_USE_TOKENS = true;
```
- Each token can only be used once
- Higher security, but requires new token for each request

### 2. IP Binding (Already Implemented)
- Tokens are already associated with IP address
- Enable strict validation if needed

### 3. User Binding (Already Implemented)
- Tokens are already associated with user ID
- Validates token belongs to authenticated user

### 4. Shorter Expiry for High-Security Operations
```javascript
// For sensitive operations like password change
const SHORT_EXPIRY = 15 * 60 * 1000; // 15 minutes
```

---

## 📞 Troubleshooting

### Issue: "CSRF token missing" on every request

**Solution:** Client must include `X-CSRF-Token` header on POST/PUT/DELETE requests

```javascript
headers: {
  'X-CSRF-Token': csrfToken
}
```

---

### Issue: "CSRF token expired"

**Solution:** Token expired after 2 hours. Get a new token:

```javascript
const response = await fetch('/api/csrf-token');
const { csrfToken } = await response.json();
```

---

### Issue: GET requests failing with CSRF error

**Solution:** This shouldn't happen - GET requests skip CSRF validation. Check middleware order in `app.js`.

---

### Issue: Too many tokens in database

**Solution:** Manual cleanup:

```bash
curl -X POST http://localhost:3000/api/csrf/cleanup \
  -H "Authorization: Bearer $ADMIN_JWT"
```

Or check automatic cleanup event is running:

```sql
SHOW EVENTS WHERE Name = 'cleanup_expired_csrf_tokens';
```

---

**End of Documentation**

Last Updated: 2025-11-06
