# Security Audit Report - Biblio Server API

**Date:** 2025-11-06
**Auditor:** Security Analysis Tool
**Scope:** Node.js REST API with JWT Authentication
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low | ℹ️ Info

---

## Executive Summary

This security audit identified **21 security issues** across multiple categories:
- **3 Critical vulnerabilities** requiring immediate attention
- **6 High severity issues**
- **7 Medium severity issues**
- **5 Low/Informational findings**

The most critical issues involve outdated dependencies with known CVEs, default credentials in production, and potential information disclosure through error messages.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. Default Admin Credentials in Production Code
**Severity:** Critical
**Location:** `migrations/001_create_auth_tables.sql:48-57`
**CWE:** CWE-798 (Use of Hard-coded Credentials)

**Description:**
The database migration includes a hardcoded default admin user with password `admin123`. The password hash is visible in the migration file and will be deployed to production.

**Impact:**
- Attackers can gain full administrative access if default credentials are not changed
- Complete system compromise possible
- Data breach, data manipulation, user account takeover

**Evidence:**
```sql
INSERT INTO usuarios (username, password_hash, email, role, active)
VALUES (
  'admin',
  '$2a$10$rZQ3qXqT5vY3LN8Zz3QZ5eYqJZ5Yx5V7Q5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z',
  'admin@abr.local',
  'admin',
  true
)
```

**Recommendation:**
1. Remove default credentials from migration file
2. Require admin user creation via secure CLI command or first-run setup
3. Implement account lockout after failed attempts
4. Force password change on first login
5. Add warning banner on login page about default credentials

---

### 2. Sensitive Credentials in Version Control
**Severity:** Critical
**Location:** `.env` file
**CWE:** CWE-540 (Inclusion of Sensitive Information in Source Code)

**Description:**
The `.env` file containing production credentials is tracked in Git (based on git status showing it). This includes:
- MySQL root password: `abr2005`
- Mega cloud storage credentials
- JWT secret key
- All database credentials

**Impact:**
- Full database access for attackers
- Ability to forge JWT tokens
- Access to cloud backup storage
- Lateral movement to other systems using same credentials

**Evidence:**
```bash
MYSQL_ROOT_PASSWORD=abr2005
MYSQL_PASSWORD=abr2005
MEGA_USER=abra4550455@gmail.com
MEGA_PASSWORD=abr2005
JWT_SECRET=63c77be3b65a41c8d5db3e9d7eae5097...
```

**Recommendation:**
1. Immediately rotate ALL credentials
2. Add `.env` to `.gitignore` if not already
3. Remove `.env` from Git history: `git filter-branch` or `git-filter-repo`
4. Use environment variable injection in CI/CD instead
5. Consider using secrets management (AWS Secrets Manager, HashiCorp Vault)
6. Never commit secrets again - use pre-commit hooks to prevent this

---

### 3. Known Critical CVEs in Dependencies
**Severity:** Critical
**Location:** `package.json` - axios, body-parser
**CVE:** Multiple (GHSA-wf5p-g6vw-rhxx, GHSA-8hc4-vh64-cxmj, GHSA-qwcr-r2fm-qrc7)

**Description:**
Several dependencies have known critical vulnerabilities:
- **axios@1.4.0** - SSRF, CSRF, and DoS vulnerabilities (Score: 7.5)
- **body-parser@1.20.1** - DoS vulnerability (Score: 7.5)

**Impact:**
- Server-Side Request Forgery (SSRF) allows internal network scanning
- Cross-Site Request Forgery (CSRF) enables unauthorized actions
- Denial of Service (DoS) can crash the application
- Credential leakage via absolute URLs

**Evidence:**
```json
npm audit results:
- axios: 4 high severity vulnerabilities
- body-parser: 1 high severity vulnerability
- Total: 21 vulnerabilities (8 low, 4 moderate, 8 high, 1 critical)
```

**Recommendation:**
```bash
# Immediate action
npm update axios body-parser
npm audit fix --force

# Verify versions
axios: upgrade to >=1.8.2
body-parser: upgrade to >=1.20.3
```

---

## 🟠 HIGH SEVERITY ISSUES

### 4. SQL Injection via Insufficient Input Validation
**Severity:** High
**Location:** `app/routes/tiradascob.js:43-62, 65-87, 90-113`
**CWE:** CWE-89 (SQL Injection)

**Description:**
While parameterized queries are used (good!), there's insufficient validation of input parameters. The `parseInt()` calls can result in `NaN`, which when passed to SQL queries may cause unexpected behavior.

**Vulnerable Code:**
```javascript
router.get('/start/:start/frompage/:frompage/topage/:topage', (req, res) => {
  var start = parseInt(req.params.start)+(parseInt(req.params.frompage) - 1)*FEE_BY_PAGE;
  var end = parseInt(req.params.start)+(parseInt(req.params.topage)*FEE_BY_PAGE - 1);
  // If params are not numbers, NaN is passed to query
  connection.query(query, [start, end], ...);
});
```

**Impact:**
- Application errors exposing internal structure
- Potential for SQL injection if NaN handling differs
- DoS through malformed requests

**Recommendation:**
```javascript
// Add validation
const start = parseInt(req.params.start);
const frompage = parseInt(req.params.frompage);
const topage = parseInt(req.params.topage);

if (isNaN(start) || isNaN(frompage) || isNaN(topage)) {
  return res.status(400).json({ error: 'Invalid parameters' });
}

if (start < 0 || frompage < 1 || topage < frompage || topage > 1000) {
  return res.status(400).json({ error: 'Parameters out of range' });
}
```

---

### 5. Database Connection Not Using Connection Pool
**Severity:** High
**Location:** `app/routes/tiradascob.js:16-22`, `app/routes/genCSRF.js:11-16`
**CWE:** CWE-404 (Improper Resource Shutdown or Release)

**Description:**
Routes use `mysql.createConnection()` instead of connection pools, creating a new connection on every import. This leads to:
- Connection exhaustion under load
- No connection error recovery
- Resource leaks
- Poor performance

**Vulnerable Code:**
```javascript
const connection = mysql.createConnection({
  host: HOST,
  port: PORT,
  user: USER,
  password: PASS,
  database: DBNAME
});
// Connection never properly closed or reused
```

**Impact:**
- Denial of Service under moderate load
- Database connection exhaustion
- Application crashes requiring restart

**Recommendation:**
```javascript
// Use connection pool (like auth.js does correctly)
const pool = mysql.createPool({
  host: HOST,
  port: PORT,
  user: USER,
  password: PASS,
  database: DBNAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Then use pool.query() instead of connection.query()
```

---

### 6. Weak CSRF Token Generation
**Severity:** High
**Location:** `app/routes/genCSRF.js:18-28`
**CWE:** CWE-330 (Use of Insufficiently Random Values)

**Description:**
CSRF tokens are generated using `Math.random()` which is NOT cryptographically secure. This makes tokens predictable.

**Vulnerable Code:**
```javascript
const generateRandomString = (myLength) => {
  const chars = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890";
  const randomArray = Array.from(
    { length: myLength },
    (v, k) => chars[Math.floor(Math.random() * chars.length)]
  );
  return randomArray.join("");
};
```

**Impact:**
- CSRF attacks possible
- Token prediction allows attackers to forge valid tokens
- Bypasses CSRF protection

**Recommendation:**
```javascript
const crypto = require('crypto');

const generateRandomString = (length) => {
  return crypto.randomBytes(length).toString('hex');
};
```

---

### 7. Missing Brute Force Protection on Registration
**Severity:** High
**Location:** `app/routes/auth.js:155-196`
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Description:**
While login has rate limiting (5 attempts per 15 min), the registration endpoint shares the same limiter. An attacker can:
- Consume the rate limit with registration attempts
- Lock out legitimate users from logging in
- Enumerate existing usernames (409 response for duplicates)

**Impact:**
- Username enumeration reveals valid accounts
- Denial of service for legitimate users
- Account creation spam

**Recommendation:**
```javascript
// Separate rate limiters
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // only 3 registrations per hour per IP
  skipSuccessfulRequests: false
});

// Apply in app.js
app.use('/api/auth/register', registerLimiter, authRouter);
app.use('/api/auth/login', authLimiter, authRouter);

// Add timing-safe username check to prevent enumeration
```

---

### 8. JWT Secret Can Default to Weak Value
**Severity:** High
**Location:** `app/middleware/auth.js:11`
**CWE:** CWE-321 (Use of Hard-coded Cryptographic Key)

**Description:**
If `JWT_SECRET` environment variable is not set, the application falls back to a hardcoded default:

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

**Impact:**
- Attackers can forge JWT tokens if default is used
- Complete authentication bypass
- Full system compromise

**Recommendation:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET not set or too weak');
  process.exit(1); // Fail fast - don't start with weak security
}
```

---

### 9. No Token Revocation on Password Change
**Severity:** High
**Location:** `app/routes/auth.js:338-408`
**CWE:** CWE-613 (Insufficient Session Expiration)

**Description:**
When a user changes their password, active JWT access tokens remain valid until expiration (1 hour). Only refresh tokens are invalidated.

**Impact:**
- Stolen tokens remain usable after password change
- Attacker maintains access even after victim changes password
- Inadequate security response to compromise

**Current Code:**
```javascript
// Invalidate all refresh tokens for this user (force re-login on all devices)
await pool.query(
  'DELETE FROM refresh_tokens WHERE user_id = ?',
  [req.user.id]
);
// But access tokens still valid!
```

**Recommendation:**
1. Implement token blacklisting table
2. Add `password_changed_at` timestamp to user record
3. Check timestamp in JWT verification middleware
4. Or reduce JWT expiration to 15 minutes

---

## 🟡 MEDIUM SEVERITY ISSUES

### 10. Information Disclosure Through Detailed Error Messages
**Severity:** Medium
**Location:** Multiple files (15 instances found via grep)
**CWE:** CWE-209 (Information Exposure Through Error Message)

**Description:**
Error messages expose internal system details:
```javascript
console.error('Error en la consulta: ', error);
return res.status(500).json({ error: 'Error en la consulta' });
```

**Impact:**
- Database structure disclosure
- SQL query patterns revealed
- Stack traces in development mode
- Aids in crafting targeted attacks

**Recommendation:**
```javascript
// Generic error to client
console.error('Database error:', error); // Log internally
return res.status(500).json({
  error: 'Internal server error',
  requestId: generateRequestId() // For support tracking
});

// Implement proper logging
const logger = require('winston');
logger.error('Query failed', { error, query, params, userId: req.user?.id });
```

---

### 11. Missing Request Size Limits
**Severity:** Medium
**Location:** `app/app.js:57-58`
**CWE:** CWE-770 (Allocation of Resources Without Limits)

**Description:**
No explicit size limits on request bodies:
```javascript
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
```

**Impact:**
- JSON/XML bomb attacks
- Memory exhaustion
- Denial of Service

**Recommendation:**
```javascript
app.use(express.json({ limit: '10kb' })); // Restrict payload size
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
```

---

### 12. No HTTPS Enforcement
**Severity:** Medium
**Location:** `app/app.js` - Missing middleware
**CWE:** CWE-319 (Cleartext Transmission of Sensitive Information)

**Description:**
No middleware to force HTTPS redirection. JWT tokens and passwords sent over HTTP if accessed incorrectly.

**Impact:**
- Man-in-the-middle attacks
- Credential interception
- Token theft

**Recommendation:**
```javascript
// Add HTTPS redirect middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Or use helmet's HSTS
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));
```

---

### 13. Insufficient Password Complexity Requirements
**Severity:** Medium
**Location:** `app/routes/auth.js:164-170`
**CWE:** CWE-521 (Weak Password Requirements)

**Description:**
Only checks password length >= 8, no complexity requirements:

```javascript
if (password.length < 8) {
  return res.status(400).json({
    error: 'Weak password',
    message: 'Password must be at least 8 characters long'
  });
}
```

**Impact:**
- Users can set weak passwords like "12345678"
- Easy brute force attacks
- Dictionary attacks succeed

**Recommendation:**
```javascript
function validatePassword(password) {
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain number' };
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain special character' };
  }
  return { valid: true };
}
```

---

### 14. Missing Input Sanitization
**Severity:** Medium
**Location:** `app/routes/auth.js`, `app/routes/apiKeys.js`
**CWE:** CWE-20 (Improper Input Validation)

**Description:**
No sanitization of user inputs (username, email, name fields). Could lead to:
- Stored XSS if data displayed in web interface
- Database encoding issues
- Log injection

**Recommendation:**
```javascript
const validator = require('validator');

// Sanitize inputs
const username = validator.trim(validator.escape(req.body.username));
const email = validator.normalizeEmail(req.body.email);

if (!validator.isAlphanumeric(username)) {
  return res.status(400).json({ error: 'Username must be alphanumeric' });
}
if (email && !validator.isEmail(email)) {
  return res.status(400).json({ error: 'Invalid email format' });
}
```

---

### 15. CORS Allows All Origins by Default
**Severity:** Medium
**Location:** `app/app.js:26-27`
**CWE:** CWE-942 (Overly Permissive Cross-domain Whitelist)

**Description:**
If `ALLOWED_ORIGINS` is not set, CORS allows all origins:
```javascript
origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
```

**Impact:**
- Any website can make requests to API
- CSRF protection weakened
- Data exfiltration possible

**Recommendation:**
```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Or fail fast
if (!process.env.ALLOWED_ORIGINS) {
  console.error('FATAL: ALLOWED_ORIGINS not configured');
  process.exit(1);
}
```

---

### 16. No Account Lockout Mechanism
**Severity:** Medium
**Location:** `app/routes/auth.js` - Missing feature
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Description:**
Rate limiting at IP level only. No account-level lockout after repeated failed attempts.

**Impact:**
- Distributed brute force attacks bypass IP rate limiting
- Credential stuffing attacks possible
- Account compromise

**Recommendation:**
```javascript
// Add failed_attempts and locked_until to usuarios table
// Track failed login attempts per account
// Lock account after 5 failures for 30 minutes
```

---

## 🟢 LOW SEVERITY / INFORMATIONAL

### 17. Insecure Direct Object References (IDOR) Risk
**Severity:** Low
**Location:** `app/routes/apiKeys.js` - DELETE/PATCH endpoints
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)

**Description:**
Admin can delete/revoke any API key by ID without ownership verification. While only admins can access these endpoints, there's no audit trail.

**Recommendation:**
- Add audit logging for all API key operations
- Verify key ownership for non-admin users

---

### 18. Missing Security Headers
**Severity:** Low
**Location:** `app/app.js:23` - Helmet configuration
**CWE:** CWE-693 (Protection Mechanism Failure)

**Description:**
Helmet is used with defaults, but some security headers could be stricter:
- No Content-Security-Policy
- No X-Frame-Options explicitly set
- No Referrer-Policy

**Recommendation:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

### 19. Unused Dependencies
**Severity:** Low
**Location:** `package.json`
**CWE:** N/A (Maintenance)

**Description:**
Some dependencies appear unused:
- `file-saver` (client-side library in server code)
- `pg-promise` (PostgreSQL library but using MySQL)

**Recommendation:**
```bash
npm uninstall file-saver pg-promise
npm audit
```

---

### 20. No API Request Logging
**Severity:** Low
**Location:** `app/app.js` - Missing audit log
**CWE:** CWE-778 (Insufficient Logging)

**Description:**
Morgan logs to console but no structured logging for:
- Failed authentication attempts
- Authorization failures
- API key usage
- Sensitive operations (password changes, user creation)

**Recommendation:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'audit.log', level: 'info' }),
  ],
});

// Log security events
logger.info('Login attempt', { username, ip: req.ip, success: true });
logger.warn('Failed login', { username, ip: req.ip, reason: 'invalid_password' });
```

---

### 21. Missing Rate Limit on Token Refresh
**Severity:** Low
**Location:** `app/routes/auth.js:218-261`
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Description:**
Token refresh endpoint has no specific rate limiting, sharing the general auth limiter (5 req/15min).

**Recommendation:**
```javascript
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Allow more refreshes than logins
  skipSuccessfulRequests: true
});
```

---

## Priority Remediation Plan

### Phase 1 - IMMEDIATE (Within 24 hours)
1. ✅ **Rotate all credentials** in `.env` and remove from Git history
2. ✅ **Update dependencies** to fix known CVEs
   ```bash
   npm update axios body-parser
   npm audit fix
   ```
3. ✅ **Remove default admin** password from migration
4. ✅ **Fix JWT secret** to fail if not properly set

### Phase 2 - HIGH PRIORITY (Within 1 week)
5. ✅ Implement **connection pooling** in tiradascob.js and genCSRF.js
6. ✅ Add **input validation** for all numeric parameters
7. ✅ Fix **CSRF token generation** to use crypto.randomBytes
8. ✅ Add **request size limits**
9. ✅ Implement **separate rate limiters** for different endpoints
10. ✅ Add **HTTPS enforcement** middleware

### Phase 3 - MEDIUM PRIORITY (Within 2 weeks)
11. ✅ Improve **password requirements** (12 chars, complexity)
12. ✅ Add **input sanitization** for text fields
13. ✅ Fix **CORS default** to not allow all origins
14. ✅ Implement **account lockout** mechanism
15. ✅ Add **audit logging** for security events

### Phase 4 - LOW PRIORITY (Within 1 month)
16. ✅ Configure stricter **security headers** with Helmet
17. ✅ Remove **unused dependencies**
18. ✅ Implement **structured logging** with Winston
19. ✅ Add **token blacklisting** for password changes
20. ✅ Create **security monitoring** dashboard

---

## Testing Recommendations

1. **Penetration Testing**
   - SQL injection testing with sqlmap
   - JWT token manipulation tests
   - Rate limiting bypass attempts
   - CSRF protection testing

2. **Automated Security Scanning**
   ```bash
   npm audit
   npm install -g snyk
   snyk test
   ```

3. **Code Review**
   - Review all database queries
   - Audit authentication/authorization logic
   - Validate input handling

4. **Runtime Security**
   - Monitor failed authentication attempts
   - Alert on suspicious patterns
   - Track rate limit violations

---

## Compliance Considerations

- **OWASP Top 10 2021**: Several findings align with OWASP risks
- **PCI DSS**: Password requirements and encryption needed if handling payments
- **GDPR**: Audit logging needed for data access/modifications
- **SOC 2**: Monitoring and alerting required

---

## Conclusion

The API has a solid foundation with JWT authentication, rate limiting, and parameterized queries. However, critical issues with default credentials, dependency vulnerabilities, and configuration weaknesses present significant risk. Immediate action on Phase 1 items is essential before production deployment.

**Overall Risk Rating: HIGH ⚠️**

After implementing Phase 1 and Phase 2 remediations, risk should reduce to **MEDIUM-LOW**.

---

**Report End**
