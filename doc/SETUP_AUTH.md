# Authentication Setup Guide

This guide will help you set up JWT authentication for the biblio-server API.

## Prerequisites

- Docker and docker-compose installed
- Application services running (`./rebuild_app.sh` or `docker-compose up -d`)

## Setup Steps

### 1. Install Dependencies (Already Done)

The required npm packages have been installed:
- jsonwebtoken
- bcryptjs
- express-rate-limit
- helmet
- cors

### 2. Apply Database Migration

Run the migration to create authentication tables:

```bash
docker exec -i mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < migrations/001_create_auth_tables.sql
```

Or manually:

```bash
docker exec -it mysql bash
mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE}
```

Then paste the contents of `migrations/001_create_auth_tables.sql`.

This creates:
- `usuarios` table (users)
- `api_keys` table (API keys for service-to-service auth)
- `refresh_tokens` table (for refresh token rotation)
- A default admin user

### 3. Restart Node.js Service

After migration, restart the Node.js container to load new code:

```bash
docker-compose restart app
```

Or rebuild:

```bash
./rebuild_app.sh
```

### 4. Test Authentication

#### A. Login with Default Admin

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

Expected response:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "email": "admin@abr.local"
  }
}
```

**IMPORTANT**: Save the `accessToken` for the next steps!

#### B. Change Admin Password

```bash
# Replace YOUR_ACCESS_TOKEN with the token from step A
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "admin123", "newPassword": "YourNewSecurePassword123!"}'
```

#### C. Test Protected Endpoint

```bash
# This should fail (401 Unauthorized)
curl http://localhost:3000/api/tirada/start/1/end/10

# This should succeed
curl http://localhost:3000/api/tirada/start/1/end/10 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Create Additional Users (Optional)

#### Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "securepass123",
    "email": "user1@example.com",
    "role": "user"
  }'
```

Note: Only admin users can be created by existing admins. Regular registration creates "user" role by default.

### 6. Create API Keys (Optional)

For service-to-service authentication:

```bash
# First, login as admin and get an access token
# Then create an API key:

curl -X POST http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "External Service",
    "userId": 1,
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

Response includes the API key (only shown once!):
```json
{
  "message": "API key created successfully",
  "apiKey": "a1b2c3d4e5f6...",
  "id": 1,
  "warning": "Save this API key now. You will not be able to see it again!"
}
```

Use the API key:
```bash
curl http://localhost:3000/api/tirada/start/1/end/10 \
  -H "X-API-Key: a1b2c3d4e5f6..."
```

## Troubleshooting

### Cannot connect to MySQL

If you see database connection errors:

```bash
# Check if MySQL is running
docker-compose ps

# Check MySQL logs
docker-compose logs db

# Try the database user fix script
./fix_db_user.sh
```

### Migration fails

If the migration fails because tables already exist:

```bash
# Drop tables and re-run migration
docker exec -it mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} -e "
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS usuarios;
"

# Then re-run the migration
docker exec -i mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < migrations/001_create_auth_tables.sql
```

### Node.js app won't start

Check the logs:
```bash
docker-compose logs -f app
```

Common issues:
- Missing npm packages: `docker exec -it nodejs bash -c "cd /usr/src/app && npm install"`
- Syntax errors: Check the file mentioned in the error

### Rate limiting is too strict

Edit `app/app.js` and adjust the rate limiters:

```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000 // Increase this number
});
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Set strong `JWT_SECRET` in `.env` (already auto-generated)
- [ ] Configured `ALLOWED_ORIGINS` in `.env` for your domain
- [ ] Reviewed user roles and permissions
- [ ] Set up HTTPS (using existing certbot setup)
- [ ] Enabled firewall rules for production
- [ ] Regular backup of `usuarios` and `api_keys` tables (already backed up by python service)

## Next Steps

1. Update your frontend/client applications to use JWT authentication
2. Add more granular permissions using `authorizeRoles()` middleware
3. Implement audit logging for sensitive operations
4. Set up monitoring for failed login attempts
5. Consider implementing 2FA for admin accounts

## Environment Variables Reference

```bash
# .env file (already configured)
JWT_SECRET=<auto-generated-secret>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000,http://localhost,https://abr.servehttp.com
```

## API Documentation

See `CLAUDE.md` for complete API documentation including:
- All authentication endpoints
- How to use protected endpoints
- API key management
- Security features
- Code examples
