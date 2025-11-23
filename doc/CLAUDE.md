# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-service library management system ("biblio-server") for Asociación Bernardino Rivadavia. It uses a Docker-based architecture with Node.js, PHP, Python, MySQL, and Nginx services working together.

## Architecture

The system consists of 6 Docker services orchestrated via `docker-compose.yml`:

1. **app (Node.js)**: Express.js REST API (port 3000)
   - Entry point: `app/bin/www`
   - Main application: `app/app.js`
   - **Authentication**: JWT-based authentication with role-based access control
   - Routes in `app/routes/`:
     - `/api/auth` - Authentication endpoints (login, register, refresh, logout) - PUBLIC
     - `/api/tirada` - Fee collection queries (tiradascob.js) - PROTECTED
     - `/api/genCSRF` - CSRF token generation - PROTECTED
     - `/api/api-keys` - API key management (root only) - PROTECTED
   - Middleware in `app/middleware/`:
     - `auth.js` - JWT token verification and role authorization
     - `apiKey.js` - API key authentication for service-to-service calls
   - Uses Pug for templating, MySQL2 for database access
   - Connects to MySQL using environment variables from `.env`
   - Security: Helmet, CORS, rate limiting enabled

2. **db (MySQL 8.0)**: Database server (port 3306)
   - Database name configured via `MYSQL_DATABASE` env var (default: "abr")
   - Database structure tracked in `estructura.sql`
   - Key tables:
     - `cobrocuotas` (fee collections), `socios` (members), `grupos` (groups)
     - `usuarios` (users for authentication)
     - `api_keys` (API keys for service-to-service auth)
     - `refresh_tokens` (refresh tokens for long-lived sessions)

3. **web (Nginx)**: Reverse proxy and PHP frontend (ports 80/443)
   - Serves PHP files from `php/` directory
   - Configuration in `nginx/data/nginx/`
   - Linked to php-fpm service
   - SSL/TLS support via Let's Encrypt (certbot)

4. **php-fpm**: PHP backend processor
   - Serves legacy PHP interface from `php/` directory
   - Key files: `lista.php`, `socio.php`, `save.php`
   - Uses `setup.php` for MySQL configuration

5. **python**: Automated database backup service
   - Main script: `python/app.py`
   - Performs MySQL dumps and uploads to Mega.nz cloud storage
   - Runs on cron schedule (9:48 AM, Mon-Sat)
   - Maintains 10 most recent backups in Mega
   - Backups stored locally in `db_bakup/` directory

6. **phpmyadmin**: Database administration UI (port 9000)

7. **certbot**: SSL certificate management

## Development Commands

### Starting the application
```bash
# Build and start all services
./rebuild_app.sh

# Or manually:
docker-compose down
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build
docker-compose up -d
```

### Working with individual services
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend        # Node.js logs
docker-compose logs -f db         # MySQL logs
docker-compose logs -f python     # Backup service logs

# Access containers
docker exec -it nodejs bash       # Node.js container
docker exec -it mysql bash        # MySQL container
docker exec -it nginx bash        # Nginx container
```

### Node.js application (app/)
```bash
# Install dependencies (run inside container or locally)
cd app && npm install

# Start development server (inside container)
node bin/www

# The app runs with nodemon for auto-reload
```

### Database operations
```bash
# Save current database structure
./save_database_structure.sh

# Fix database user permissions
./fix_db_user.sh

# Connect to MySQL
docker exec -it mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE}
```

### Python backup service
```bash
# Run backup manually
docker exec -it python python /app/app.py

# Or use the backup script
docker exec -it python /app/do_backup.sh
```

## Database Connection

The Node.js app connects to MySQL using environment variables from `.env`:
- `MYSQL_HOST`: Database host (default: "mysql" - Docker service name)
- `MYSQL_PORT`: Database port (default: 3306)
- `MYSQL_USER`: Database user
- `MYSQL_PASSWORD`: Database password
- `MYSQL_DATABASE`: Database name

**Important**: MySQL 8.0 uses `mysql_native_password` authentication. If you encounter authentication issues, run `fix_db_user.sh` to update the user authentication plugin.

## Key Data Flow

1. **Fee Collection Queries**:
   - PHP frontend (`php/lista.php`) or external clients call Node.js API
   - Node.js routes (`app/routes/tiradascob.js`) query MySQL
   - Three query modes:
     - Range by ID: `/api/tirada/start/:start/end/:end`
     - Paginated: `/api/tirada/start/:start/frompage/:from/topage/:to`
     - Custom IDs: `/api/tirada/custom/:id1/:id2/.../:id8`
   - Queries filter for non-cancelled, collected, non-debit fees (`CC_Anulado="N"`, `CC_Cobrado<>""`, `CC_Debito="N"`)

2. **Database Backups**:
   - Python service runs scheduled backups via cron
   - Creates mysqldump → compresses with bzip2 → uploads to Mega.nz
   - Automatically rotates old backups (keeps 10 most recent)

## Network Architecture

- All services communicate via `app_network` bridge network
- Node.js app can reach MySQL at hostname `mysql:3306`
- PHP backend can reach MySQL at hostname `db:3306`
- External access:
  - Node.js API: `localhost:3000`
  - PHP/Nginx web: `localhost:80`, `localhost:443`
  - phpMyRoot: `localhost:9000`
  - MySQL: `localhost:3306`

## File Structure Notes

- `app/`: Node.js Express application
- `php/`: Legacy PHP frontend interface
- `python/`: Backup automation service
- `nginx/`: Nginx configuration and SSL certificates
- `data/`: MySQL data directory (not in git)
- `db_bakup/`: Local backup storage (not in git)
- `estructura.sql`: Database schema snapshot
- `.env`: Environment variables (credentials - not in git)

## Important Constants

- `FEE_BY_PAGE = 8`: Number of fee records per page in paginated queries (defined in `app/routes/tiradascob.js:6`)

## SSL/HTTPS Setup

The project includes Let's Encrypt SSL certificate management:
- `init-letsencript.sh`: Initial certificate setup script
- Certbot auto-renews certificates every 12 hours
- Nginx reloads configuration every 6 hours

## Authentication & Security

The system supports three authentication methods:
1. **JWT Authentication** - Traditional username/password login
2. **OAuth2** - Social login (Google, GitHub)
3. **API Keys** - Service-to-service authentication

### JWT Authentication

The API uses JWT (JSON Web Tokens) for authentication. All protected endpoints require a valid JWT token.

#### Setup and Migration

1. **Apply database migration** (run from project root):
   ```bash
   docker exec -i mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < migrations/001_create_auth_tables.sql
   ```

2. **Default credentials** (created by migration):
   - Username: `root`
   - Password: `admin123`
   - **IMPORTANT**: Change this password immediately after first login!

**Note on User Registration:**
- New user registrations automatically receive the `new_user` role
- `new_user` role has **no permissions** and cannot access any protected endpoints
- Root must manually upgrade user roles to grant access
- This prevents unauthorized access by default

3. **Environment variables** (already configured in `.env`):
   - `JWT_SECRET`: Secret key for signing tokens (auto-generated)
   - `JWT_EXPIRES_IN`: Access token expiration (default: 1h)
   - `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration (default: 7d)
   - `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)

#### Authentication Endpoints

All auth endpoints are under `/api/auth`:

- **POST /api/auth/login** - Login and get tokens
  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "root", "password": "admin123"}'
  ```
  Response: `{ accessToken, refreshToken, user }`

- **POST /api/auth/register** - Register new user
  ```bash
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username": "newuser", "password": "password123", "email": "user@example.com"}'
  ```

- **POST /api/auth/refresh** - Refresh access token
  ```bash
  curl -X POST http://localhost:3000/api/auth/refresh \
    -H "Content-Type: application/json" \
    -d '{"refreshToken": "your-refresh-token"}'
  ```

- **POST /api/auth/logout** - Logout (invalidate refresh token)
  ```bash
  curl -X POST http://localhost:3000/api/auth/logout \
    -H "Authorization: Bearer your-access-token" \
    -H "Content-Type: application/json" \
    -d '{"refreshToken": "your-refresh-token"}'
  ```

- **GET /api/auth/me** - Get current user info
  ```bash
  curl http://localhost:3000/api/auth/me \
    -H "Authorization: Bearer your-access-token"
  ```

- **POST /api/auth/change-password** - Change password
  ```bash
  curl -X POST http://localhost:3000/api/auth/change-password \
    -H "Authorization: Bearer your-access-token" \
    -H "Content-Type: application/json" \
    -d '{"currentPassword": "old", "newPassword": "new123456"}'
  ```

#### Using Protected Endpoints

All protected endpoints require the `Authorization` header with a valid JWT token:

```bash
# Example: Access protected endpoint
curl http://localhost:3000/api/tirada/start/1/end/10 \
  -H "Authorization: Bearer your-access-token"
```

#### User Roles

The system supports six roles with different permission levels:
- `root`: Full access to all endpoints including user/API key management
- `admin_employee`: Full CRUD access to socios, tirada, and cobrocuotas (administrative staff)
- `user`: Read-only access to all resources
- `readonly`: Read-only access (similar to user, no API key access)
- `printer`: Printer client access (read + print tirada data)
- `new_user`: **Default role for new registrations** - No permissions (awaiting root approval)

Use `authorizeRoles()` middleware to restrict endpoints by role:
```javascript
router.get('/root-only', authenticateToken, authorizeRoles('root'), handler);
```

### OAuth2 Authentication

The system supports OAuth2 social login with multiple providers: **Google**, **GitHub**, **Facebook**, and **Microsoft**.

#### Setup OAuth Providers

1. **Apply OAuth migration** (run from project root):
   ```bash
   docker exec -i mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < migrations/004_add_oauth_support.sql
   ```

2. **Configure OAuth providers in `.env`**:
   ```bash
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/oauth/google/callback

   # GitHub OAuth
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/oauth/github/callback

   # Facebook OAuth
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret
   FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/oauth/facebook/callback

   # Microsoft OAuth
   MICROSOFT_CLIENT_ID=your_microsoft_client_id
   MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
   MICROSOFT_CALLBACK_URL=http://localhost:3000/api/auth/oauth/microsoft/callback

   # Redirect after successful OAuth
   OAUTH_SUCCESS_REDIRECT=http://localhost:3000/dashboard
   ```

3. **Get OAuth credentials**:
   - Google: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - GitHub: [GitHub Developer Settings](https://github.com/settings/developers)
   - Facebook: [Facebook Developers](https://developers.facebook.com/apps/)
   - Microsoft: [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)

#### OAuth Endpoints

- **GET /api/auth/oauth/providers** - List available OAuth providers
- **GET /api/auth/oauth/google** - Initiate Google OAuth
- **GET /api/auth/oauth/github** - Initiate GitHub OAuth
- **GET /api/auth/oauth/facebook** - Initiate Facebook OAuth
- **GET /api/auth/oauth/microsoft** - Initiate Microsoft OAuth
- **GET /api/auth/oauth/*/callback** - OAuth callbacks (automatic)

#### OAuth Flow

1. User clicks "Sign in with Google/GitHub/Facebook/Microsoft" button
2. Redirects to OAuth provider for authorization
3. User approves access
4. OAuth provider redirects back to callback URL
5. Application creates/links user account
6. Returns JWT tokens (via redirect or JSON)

**For detailed OAuth setup instructions, see [OAUTH_SETUP.md](./OAUTH_SETUP.md)**

### API Key Authentication

For service-to-service authentication, use API keys instead of JWT tokens.

#### Managing API Keys

API key endpoints are root-only and require JWT authentication:

- **POST /api/api-keys** - Create new API key
  ```bash
  curl -X POST http://localhost:3000/api/api-keys \
    -H "Authorization: Bearer root-jwt-token" \
    -H "Content-Type: application/json" \
    -d '{"name": "My Service", "userId": 1, "expiresAt": "2025-12-31T23:59:59Z"}'
  ```
  **Note**: The API key is only shown once! Save it immediately.

- **GET /api/api-keys** - List all API keys
  ```bash
  curl http://localhost:3000/api/api-keys \
    -H "Authorization: Bearer root-jwt-token"
  ```

- **PATCH /api/api-keys/:id/revoke** - Revoke an API key
  ```bash
  curl -X PATCH http://localhost:3000/api/api-keys/1/revoke \
    -H "Authorization: Bearer root-jwt-token"
  ```

- **DELETE /api/api-keys/:id** - Delete an API key
  ```bash
  curl -X DELETE http://localhost:3000/api/api-keys/1 \
    -H "Authorization: Bearer root-jwt-token"
  ```

#### Using API Keys

Use the `X-API-Key` header instead of `Authorization` header:

```bash
curl http://localhost:3000/api/tirada/start/1/end/10 \
  -H "X-API-Key: your-api-key-here"
```

To enable API key authentication on a route, use `authenticateApiKey` middleware:
```javascript
const { authenticateApiKey } = require('./middleware/apiKey');
app.use('/api/external', authenticateApiKey, externalRouter);
```

### Security Features

- **Helmet**: Sets secure HTTP headers
- **CORS**: Configured to allow specific origins only (set in `ALLOWED_ORIGINS` env var)
- **Rate Limiting**:
  - API endpoints: 100 requests per 15 minutes per IP
  - Auth endpoints: 5 login attempts per 15 minutes per IP
- **Password Requirements** (Strong password policy):
  - Minimum 8 characters
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least 2 numbers (0-9)
  - At least 1 special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?~`)
  - No spaces, tabs, or newlines allowed
  - Maximum 128 characters
  - Example valid password: `MyP@ssw0rd99`
- **Token Expiration**: Access tokens expire after 1 hour, refresh tokens after 7 days
- **Secure Password Storage**: Bcrypt hashing with salt rounds = 10

### Adding Authentication to New Routes

```javascript
// JWT authentication only
app.use('/api/myroute', authenticateToken, myRouter);

// JWT + role-based authorization
app.use('/api/root', authenticateToken, authorizeRoles('root'), adminRouter);

// API key authentication
app.use('/api/service', authenticateApiKey, serviceRouter);

// Allow both JWT and API key (custom middleware needed)
const allowBoth = (req, res, next) => {
  if (req.headers['x-api-key']) {
    return authenticateApiKey(req, res, next);
  }
  return authenticateToken(req, res, next);
};
app.use('/api/flexible', allowBoth, flexibleRouter);
```
