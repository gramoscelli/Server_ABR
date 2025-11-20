# Rate Limiting Configuration

## Overview

The biblio-server implements IP-based rate limiting to protect against brute force attacks and API abuse. Rate limiting is enforced at two levels with different thresholds.

---

## Rate Limiters

### 1. Authentication Rate Limiter (`authLimiter`)

**Purpose**: Prevents brute force login attacks

**Configuration**:
- **Window**: 15 minutes (900,000ms)
- **Max Attempts**: 5 per IP address
- **Applied to**: `/api/auth/*` routes

**Protected Endpoints**:
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/change-password` - Password change

**Error Response**:
```json
{
  "error": "Too many login attempts",
  "message": "Too many login attempts from this IP, please try again later."
}
```

**HTTP Status**: 429 (Too Many Requests)

---

### 2. General API Rate Limiter (`apiLimiter`)

**Purpose**: Prevents API abuse and DoS attacks

**Configuration**:
- **Window**: 15 minutes (900,000ms)
- **Max Requests**: 100 per IP address
- **Applied to**: All `/api/*` routes (except auth)

**Protected Endpoints**:
- `GET /api/csrf-token` - CSRF token generation
- `/api/tirada/*` - Fee collection queries
- `/api/api-keys/*` - API key management
- `/api/admin/*` - Admin endpoints
- `/api/roles/*` - Role management
- `/api/csrf/*` - CSRF management

**Error Response**:
```json
{
  "error": "Too many requests",
  "message": "Too many requests from this IP, please try again later."
}
```

**HTTP Status**: 429 (Too Many Requests)

---

## Implementation Details

### Location

Rate limiting is configured in `app/app.js` lines 71-91.

### Code

```javascript
// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Authentication rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: 'Too many login attempts',
    message: 'Too many login attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

### Application

```javascript
// Apply to CSRF token endpoint
app.get('/api/csrf-token', apiLimiter, generateCsrfToken);

// Apply to authentication routes
app.use('/api/auth', authLimiter, validateCsrfToken, authRouter);

// Apply to other API routes
app.use('/api/tirada', apiLimiter, authenticateEither, tiradascob);
app.use('/api/api-keys', apiLimiter, validateCsrfToken, apiKeysRouter);
// ... etc
```

---

## Rate Limit Headers

The server sends standard rate limit headers with each response:

| Header | Description |
|--------|-------------|
| `RateLimit-Limit` | Maximum number of requests allowed in the time window |
| `RateLimit-Remaining` | Number of requests remaining in the current window |
| `RateLimit-Reset` | Unix timestamp when the rate limit window resets |

**Example Response Headers**:
```
RateLimit-Limit: 5
RateLimit-Remaining: 3
RateLimit-Reset: 1699456800
```

---

## Additional Security Layers

Rate limiting works in conjunction with other security mechanisms:

### 1. Account Lockout (User-Level)

Beyond IP-based rate limiting, individual user accounts are locked after failed login attempts:

- **Threshold**: 5 failed login attempts
- **Lockout Duration**: 30 minutes
- **Tracking**: Per user account (stored in database)
- **Location**: `app/models/User.js` - `incrementFailedAttempts()`

**Important**: Even if an attacker bypasses IP rate limiting (e.g., using multiple IPs), account lockout prevents credential stuffing attacks.

### 2. CSRF Protection

All state-changing operations require valid CSRF tokens.

### 3. Payload Size Limits

- JSON payloads: 10kb max
- URL-encoded payloads: 10kb max

---

## Testing Rate Limiting

### Manual Test

```bash
# Test authentication rate limiter
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')" \
    -d '{"username": "test", "password": "wrong"}'
  echo ""
done
```

**Expected Result**:
- Attempts 1-5: `401 Unauthorized` (invalid credentials)
- Attempt 6: `429 Too Many Requests` (rate limit exceeded)

### Automated Test

The test script `test_app_API.sh` includes rate limiting tests.

---

## Troubleshooting

### Issue: Legitimate users getting blocked

**Solution**:
- Check if IP address is shared (e.g., corporate network, NAT)
- Consider implementing user-based rate limiting instead of IP-based
- Adjust `max` threshold if needed

### Issue: Rate limit not working

**Verification**:
1. Check application logs for rate limiter initialization
2. Verify `express-rate-limit` package is installed
3. Confirm rate limiter middleware is applied to routes

```bash
# Check if package is installed
docker exec nodejs npm list express-rate-limit

# Check application logs
docker logs nodejs | grep -i "rate"
```

---

## Configuration Changes

### History

**2025-11-08**: Corrected rate limiting window
- **Before**: 1 minute window (too short)
- **After**: 15 minutes window (correct)
- **Reason**: 1-minute window was too restrictive and didn't match security requirements

### Customization

To adjust rate limits, edit `app/app.js`:

```javascript
// Example: Increase auth attempts to 10 per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // Changed from 5 to 10
  // ...
});
```

**Important**: After changing configuration, restart the application:
```bash
docker restart nodejs
```

---

## Security Considerations

### Bypass Prevention

Rate limiting alone is not sufficient. The system implements defense in depth:

1. **IP-based rate limiting** (this document)
2. **Account lockout** (user-level)
3. **CSRF tokens** (request validation)
4. **Strong password requirements** (minimum 8 chars, complexity)
5. **JWT expiration** (1 hour for access tokens)

### Distributed Attacks

For production deployments with multiple servers:

- Consider using a shared store (Redis) for rate limit counters
- Implement rate limiting at the reverse proxy/load balancer level
- Use services like Cloudflare for additional DDoS protection

---

## See Also

- [BRUTE_FORCE_PROTECTION.md](./BRUTE_FORCE_PROTECTION.md) - Account lockout mechanism
- [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) - Complete security audit
- [CLAUDE.md](./CLAUDE.md) - Main project documentation

---

**Last Updated**: 2025-11-08
**Configuration**: 5 login attempts per 15 minutes (IP-based)
