# Brute Force Protection Documentation

**Date:** 2025-11-06
**Status:** ✅ FULLY PROTECTED

This document explains the multi-layered brute force protection implemented in the biblio-server API.

---

## 🛡️ Protection Layers

The authentication system now has **3 layers of brute force protection**:

### Layer 1: IP-Based Rate Limiting
**Location:** `app/app.js` - `authLimiter`

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts
});
```

**Protection:**
- ✅ Blocks **5 login attempts per IP** every 15 minutes
- ✅ Protects against simple brute force from single IP
- ✅ Fast response (happens before hitting the database)

**Limitations:**
- ❌ Can be bypassed using multiple IPs (botnets, proxies)
- ❌ Shared IP addresses (NAT) can affect legitimate users

---

### Layer 2: Account-Level Lockout
**Location:** `app/routes/auth.js` - Login endpoint

**Database Fields (migration `002_add_account_lockout.sql`):**
- `failed_attempts` - Counter for consecutive failed logins
- `locked_until` - Timestamp when account will be unlocked
- `last_failed_attempt` - Track last failed login time

**Protection:**
```javascript
Max Failed Attempts: 5
Lockout Duration: 30 minutes
Auto-unlock: After lockout period expires
```

**How it works:**
1. Failed login → Increment `failed_attempts`
2. After 5 failures → Lock account for 30 minutes
3. Locked account → Return 403 with time remaining
4. Successful login → Reset counter to 0
5. Auto-unlock → After 30 minutes, next attempt resets counter

**Protection:**
- ✅ Protects against **distributed brute force** (multiple IPs)
- ✅ Protects the **account itself**, not just the IP
- ✅ Cannot be bypassed by changing IPs
- ✅ Legitimate user can retry after lockout period

**Example Response When Locked:**
```json
{
  "error": "Account locked",
  "message": "Account locked due to 5 failed login attempts. Account will be unlocked in 30 minutes.",
  "locked_until": "2025-11-06T15:30:00.000Z"
}
```

---

### Layer 3: Timing-Safe Username Enumeration Prevention
**Location:** `app/routes/auth.js` - Login endpoint

**Problem:**
Attackers can determine if a username exists by comparing response times or error messages.

**Protection Implemented:**

#### 3.1 Generic Error Messages
```javascript
// Same message for both invalid username AND invalid password
return res.status(401).json({
  error: 'Invalid credentials',
  message: 'Username or password is incorrect'
});
```

#### 3.2 Timing-Safe Password Comparison
```javascript
// ALWAYS perform bcrypt comparison, even if user doesn't exist
const dummyHash = '$2a$10$' + 'X'.repeat(53);
const hashToCompare = userExists ? user.password_hash : dummyHash;
const validPassword = await bcrypt.compare(password, hashToCompare);
```

**Why this matters:**
- ✅ Same execution time whether username exists or not
- ✅ Prevents username enumeration via timing attacks
- ✅ Prevents username enumeration via different error messages

---

## 📊 Complete Protection Summary

| Attack Type | Protected | Protection Layer |
|-------------|-----------|------------------|
| Single IP brute force | ✅ Yes | Layer 1: IP rate limit (5/15min) |
| Distributed brute force (botnet) | ✅ Yes | Layer 2: Account lockout (5 attempts) |
| Credential stuffing | ✅ Yes | Layer 2: Account lockout |
| Username enumeration | ✅ Yes | Layer 3: Timing-safe responses |
| Password spraying | ✅ Yes | Layer 2: Account lockout |
| Slow brute force | ✅ Yes | Layers 1 + 2 combined |

---

## 🔧 Configuration

All protection parameters are configurable in `app/routes/auth.js`:

```javascript
// Account lockout settings
const maxAttempts = 5;                  // Failed attempts before lock
const lockoutDurationMinutes = 30;      // How long to lock account

// IP rate limiting (in app.js)
windowMs: 15 * 60 * 1000,               // Time window
max: 5,                                 // Max requests per window
```

**Recommended Settings by Security Level:**

| Security Level | Max Attempts | Lockout Duration | IP Rate Limit |
|----------------|--------------|------------------|---------------|
| Low (testing) | 10 | 10 minutes | 10/15min |
| **Medium (current)** | **5** | **30 minutes** | **5/15min** |
| High (banking) | 3 | 60 minutes | 3/15min |
| Maximum | 3 | 24 hours | 3/15min |

---

## 🔓 Admin Account Unlock

Admins can unlock accounts manually via new admin endpoints:

### Unlock a Specific Account
```bash
POST /api/admin/users/:userId/unlock

curl -X POST http://localhost:3000/api/admin/users/5/unlock \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Response:**
```json
{
  "message": "Account unlocked successfully",
  "user": {
    "id": 5,
    "username": "john_doe",
    "was_locked_until": "2025-11-06T15:30:00.000Z",
    "failed_attempts_reset": 5
  }
}
```

### View All Locked Accounts
```bash
GET /api/admin/users/locked

curl http://localhost:3000/api/admin/users/locked \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Response:**
```json
{
  "count": 2,
  "users": [
    {
      "id": 5,
      "username": "john_doe",
      "email": "john@example.com",
      "failed_attempts": 5,
      "locked_until": "2025-11-06T15:30:00.000Z",
      "last_failed_attempt": "2025-11-06T15:00:00.000Z"
    }
  ]
}
```

### View All Users with Security Status
```bash
GET /api/admin/users

curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Reset Failed Attempts (without unlocking early)
```bash
PATCH /api/admin/users/:userId/reset-attempts

curl -X PATCH http://localhost:3000/api/admin/users/5/reset-attempts \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## 📁 Files Modified/Created

### Modified:
1. ✅ `app/routes/auth.js` - Added account lockout logic
2. ✅ `app/app.js` - Added admin routes

### Created:
1. ✅ `migrations/002_add_account_lockout.sql` - Database schema changes
2. ✅ `app/routes/admin.js` - Admin endpoints for account management
3. ✅ `BRUTE_FORCE_PROTECTION.md` - This documentation

---

## 🚀 Deployment Steps

### 1. Apply Database Migration
```bash
docker exec -i mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < migrations/002_add_account_lockout.sql
```

### 2. Restart Application
```bash
docker-compose restart app
```

### 3. Verify Protection

**Test 1: Account Lockout**
```bash
# Try 6 failed logins with same username
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "wrong_password"}'
  echo ""
done

# 6th attempt should return account locked message
```

**Test 2: IP Rate Limiting**
```bash
# Try 6 logins with different usernames (hits IP limit)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"user$i\", \"password\": \"wrong\"}"
  echo ""
done

# 6th attempt should return rate limit error
```

**Test 3: Username Enumeration Prevention**
```bash
# Try non-existent user
time curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "nonexistent", "password": "wrong"}'

# Try real user with wrong password
time curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "wrong"}'

# Timing should be approximately the same (both ~100-200ms)
```

**Test 4: Admin Unlock**
```bash
# First, lock an account (5 failed attempts)
# Then login as admin and unlock it
ADMIN_TOKEN="your_admin_jwt_token"

curl -X POST http://localhost:3000/api/admin/users/USER_ID/unlock \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 🔍 Monitoring & Logging

All security events are logged to console:

```javascript
// Failed login attempts
console.log('Failed login attempt for user:', username);

// Account locks
console.log('Account locked:', username, 'until:', lockedUntil);

// Admin unlocks
console.log('Admin', adminUsername, 'unlocked account for user', username);
```

**Recommended:** Set up log aggregation (Winston, Logstash, etc.) to:
- Alert on multiple failed attempts
- Track account lockouts by user/IP
- Monitor admin unlock activities
- Detect credential stuffing patterns

---

## ⚠️ Important Notes

### For Developers:
1. **Failed attempts counter is per account**, not per IP
2. **Lockout is automatic** after 5 failures
3. **Auto-unlock** happens after 30 minutes
4. **Successful login resets** the counter
5. **Admin can unlock** accounts anytime

### For Users:
1. After 5 failed attempts, account locks for 30 minutes
2. Wait for auto-unlock or contact admin
3. Successful login resets the counter
4. Use password reset if you forgot your password

### For Admins:
1. Use `/api/admin/users/locked` to monitor locked accounts
2. Use `/api/admin/users/:id/unlock` to help users
3. Frequent locks may indicate attack - investigate
4. Consider implementing CAPTCHA after 3 failures (future enhancement)

---

## 🔜 Future Enhancements

Consider implementing these additional protections:

1. **CAPTCHA/reCAPTCHA** after 3 failed attempts
2. **Email notifications** when account is locked
3. **Progressive delays** (increase lockout time with each lock)
4. **IP reputation checking** (block known malicious IPs)
5. **2FA/MFA** for high-value accounts
6. **Anomaly detection** (unusual login patterns)
7. **Device fingerprinting** (detect suspicious devices)
8. **Geolocation blocking** (restrict by country)

---

## 📞 Support

If you experience issues:
- Check locked accounts: `/api/admin/users/locked`
- Review logs for failed attempts
- Unlock accounts via admin endpoints
- Adjust lockout parameters if needed

---

**End of Documentation**

Last Updated: 2025-11-06
