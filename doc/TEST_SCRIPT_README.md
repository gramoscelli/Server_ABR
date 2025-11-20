# API Test Script Documentation

## Overview

The `test_app_API.sh` script is a comprehensive testing tool for the biblio-server API. It tests all major endpoints including authentication, CSRF protection, authorization, and security features.

## Location

```
/home/gustavo/biblio-server/test_app_API.sh
```

## Usage

### Basic Usage

```bash
cd /home/gustavo/biblio-server
./test_app_API.sh
```

### Prerequisites

**Optional but Recommended:**
- `jq` - JSON parser for better output formatting
  - Ubuntu/Debian: `sudo apt-get install jq`
  - macOS: `brew install jq`
  - The script works without jq but formatting will be less readable

### Important Notes

⚠️ **Rate Limiting**: The API has rate limiting enabled (15 minutes window). If you run the script multiple times in quick succession, you may hit the rate limit and see 429 errors. Wait 15 minutes between test runs or temporarily disable rate limiting for testing.

⚠️ **Test Data**: The script creates test users with random usernames (e.g., `testuser_1730920353`) to avoid conflicts. These are real database entries.

## Tests Performed

### 1. Health Check
- **Endpoint**: `GET /`
- **Purpose**: Verify server is running
- **Expected**: HTTP 200 or 404

### 2. CSRF Token Generation
- **Endpoint**: `GET /api/csrf-token`
- **Purpose**: Test CSRF token generation
- **Expected**: HTTP 200 with token
- **Verifies**:
  - Token is 64-character hex string
  - Expiration time is set
  - Token stored for subsequent requests

### 3. User Registration
- **Endpoint**: `POST /api/auth/register`
- **Purpose**: Test user registration with CSRF protection
- **Data Sent**:
  ```json
  {
    "username": "testuser_<timestamp>",
    "password": "TestPassword123!",
    "email": "testuser_<timestamp>@example.com"
  }
  ```
- **Headers**: `X-CSRF-Token`
- **Expected**: HTTP 201 with user data
- **Verifies**:
  - CSRF token validation
  - Input sanitization
  - Password hashing
  - User creation

### 4. User Login
- **Endpoint**: `POST /api/auth/login`
- **Purpose**: Test authentication
- **Expected**: HTTP 200 with JWT tokens
- **Returns**:
  - `accessToken` - Short-lived JWT (1 hour)
  - `refreshToken` - Long-lived token (7 days)
- **Verifies**:
  - Credential validation
  - Token generation
  - Brute force protection

### 5. Invalid Login (Security Test)
- **Endpoint**: `POST /api/auth/login`
- **Purpose**: Test failed login handling
- **Data**: Wrong password
- **Expected**: HTTP 401
- **Verifies**:
  - Failed attempts are tracked
  - Error messages don't leak information

### 6. Token Refresh
- **Endpoint**: `POST /api/auth/refresh`
- **Purpose**: Test JWT token refresh
- **Expected**: HTTP 200 with new accessToken
- **Verifies**:
  - Refresh token validation
  - New access token generation

### 7. Protected Endpoint Without Token
- **Endpoint**: `GET /api/admin/users`
- **Purpose**: Verify authentication is required
- **Expected**: HTTP 401 or 403
- **Verifies**:
  - Endpoints are properly protected
  - Authentication middleware works

### 8. Protected Endpoint With Token
- **Endpoint**: `GET /api/admin/users`
- **Purpose**: Test authenticated access
- **Headers**: `Authorization: Bearer <token>`
- **Expected**: HTTP 200 (admin) or 403 (non-admin)
- **Verifies**:
  - Token validation
  - Role-based access control

### 9. Tiradas de Cobro Endpoints
Tests three fee collection endpoints:

#### a) By ID Range
- **Endpoint**: `GET /api/tirada/start/1/end/10`
- **Purpose**: Retrieve records by ID range
- **Auth**: Required

#### b) Paginated
- **Endpoint**: `GET /api/tirada/page/1`
- **Purpose**: Get paginated results
- **Auth**: Required

#### c) By Group
- **Endpoint**: `GET /api/tirada/group/1`
- **Purpose**: Filter by group ID
- **Auth**: Required

### 10. XSS Prevention (Security Test)
- **Endpoint**: `POST /api/auth/login`
- **Purpose**: Test XSS attack prevention
- **Data**: Username with `<script>` tags
- **Expected**: Sanitized or rejected
- **Verifies**:
  - Input sanitization
  - HTML escaping

### 11. SQL Injection Prevention (Security Test)
- **Endpoint**: `POST /api/auth/login`
- **Purpose**: Test SQL injection prevention
- **Data**: SQL injection attempt in credentials
- **Expected**: HTTP 401 or 400
- **Verifies**:
  - Parameterized queries (Sequelize ORM)
  - Input validation

### 12. Rate Limiting (Security Test)
- **Endpoint**: `GET /api/csrf-token`
- **Purpose**: Verify rate limiting is active
- **Method**: Send 10+ rapid requests
- **Expected**: HTTP 429 after limit
- **Verifies**:
  - Rate limiting middleware
  - DoS protection

### 13. CORS Headers (Security Test)
- **Endpoint**: `OPTIONS /api/csrf-token`
- **Purpose**: Test CORS configuration
- **Expected**: CORS headers present
- **Verifies**:
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Methods`
  - `Access-Control-Allow-Credentials`

### 14. Invalid JSON Handling
- **Endpoint**: `POST /api/auth/login`
- **Purpose**: Test malformed JSON handling
- **Data**: Invalid JSON syntax
- **Expected**: HTTP 400
- **Verifies**:
  - Error handling
  - Graceful failure

### 15. User Logout
- **Endpoint**: `POST /api/auth/logout`
- **Purpose**: Test logout functionality
- **Expected**: HTTP 200
- **Verifies**:
  - Token invalidation
  - Refresh token removal

## Output Format

The script provides colored output:
- 🟦 **BLUE**: Section headers
- 🟨 **YELLOW**: Test descriptions
- 🟩 **GREEN**: Passed tests (✓)
- 🟥 **RED**: Failed tests (✗)

### Example Output

```
╔════════════════════════════════════════════════════════╗
║     Biblio-Server API Test Suite                      ║
║     Testing: http://localhost:3000                     ║
╚════════════════════════════════════════════════════════╝

========================================
1. CSRF TOKEN GENERATION
========================================

TEST: GET /api/csrf-token - Generate CSRF token
✓ PASS: CSRF token generated
{
  "csrfToken": "c1136bad44f66a54f49c07c5c9c0d2877928686c...",
  "expiresAt": "2025-11-06T20:11:04.443Z",
  "expiresIn": 7200
}
Saved CSRF Token: c1136bad44f66a54f49c...

========================================
TEST SUMMARY
========================================

Total Tests: 17
Passed: 15
Failed: 2

========================================
   ALL TESTS PASSED! ✓
========================================
```

## Customization

### Change Base URL

Edit the script and modify:
```bash
BASE_URL="http://localhost:3000"
```

### Skip Specific Tests

Comment out test function calls in the `main()` function:
```bash
main() {
    # test_health_check
    test_csrf_token_generation
    test_user_registration
    # ... etc
}
```

### Add New Tests

Follow this template:
```bash
test_new_endpoint() {
    print_header "N. NEW TEST"

    print_test "GET /api/new-endpoint - Description"
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/new-endpoint")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Test passed"
        print_response "$BODY"
    else
        print_error "Test failed (HTTP $HTTP_CODE)"
        print_response "$BODY"
    fi
}
```

## Troubleshooting

### Issue: All tests return 429

**Cause**: Rate limiting in effect

**Solution**:
1. Wait 15 minutes
2. Or temporarily disable rate limiting in `app.js`:
   ```javascript
   // Comment out:
   // app.use('/api/auth', authLimiter);
   ```

### Issue: Tests fail with connection refused

**Cause**: Server not running

**Solution**:
```bash
docker compose ps app
docker compose up -d app
```

### Issue: CSRF token extraction fails

**Cause**: jq not installed

**Solution**:
- Install jq: `sudo apt-get install jq`
- Or the script will fallback to grep/sed (may be less reliable)

### Issue: User already exists

**Cause**: Previous test run created user

**Solution**: Script generates unique usernames with timestamps, this shouldn't occur. If it does, manually delete test users:
```bash
docker compose exec db mysql -uroot -pabr2005 abr -e "DELETE FROM usuarios WHERE username LIKE 'testuser_%'"
```

## Security Considerations

⚠️ **Warning**: This script is for **testing purposes only**. Do not run on production systems without:

1. Disabling rate limiting temporarily
2. Using a test database
3. Cleaning up test data afterward
4. Ensuring test credentials are not production credentials

## Integration with CI/CD

The script returns exit code 0 if all tests pass, non-zero otherwise:

```bash
./test_app_API.sh
if [ $? -eq 0 ]; then
    echo "All tests passed"
else
    echo "Tests failed"
    exit 1
fi
```

### GitHub Actions Example

```yaml
name: API Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start services
        run: docker compose up -d
      - name: Wait for server
        run: sleep 10
      - name: Run tests
        run: ./test_app_API.sh
```

## Related Files

- **Test Suite**: `app/test/` - Jest test suite for unit/integration tests
- **API Routes**: `app/routes/` - Route implementations
- **Middleware**: `app/middleware/` - Authentication, CSRF, sanitization
- **Models**: `app/models/` - Sequelize database models

## Support

For issues or questions:
1. Check application logs: `docker compose logs app`
2. Verify database connection: `docker compose exec db mysql -uroot -pabr2005`
3. Check server status: `curl http://localhost:3000/api/csrf-token`

---

**Last Updated**: 2025-11-06
**Version**: 1.0
**Maintainer**: Development Team
