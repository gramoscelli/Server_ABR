# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Biblio-Server**: Multi-service library management system for Asociación Bernardino Rivadavia (ABR). Full-stack application with microservices architecture using Docker, featuring JWT/OAuth2 authentication, role-based access control, and automated database backups.

**Stack**: Node.js/Express (backend API), React/Vite/TypeScript (frontend), MySQL 8.0 (database), Python (backup service), PHP (legacy interface), Nginx (reverse proxy)

## Architecture

The system consists of **7 Docker services** orchestrated via `docker-compose.yml`:

1. **frontend**: React + Vite + TypeScript + Tailwind CSS (port 3001)
   - Entry: `frontend/src/main.tsx`
   - Modern UI with Zustand state management
   - Communicates with backend API via `NEXT_PUBLIC_API_URL`

2. **app (Node.js)**: Express.js REST API (port 3000)
   - Entry: `app/bin/www`
   - JWT/OAuth2 authentication with 4 providers (Google, GitHub, Facebook, Microsoft)
   - Role-based access control (6 roles: root, admin_employee, library_employee, readonly, printer, new_user)
   - API routes: `/api/auth`, `/api/tirada`, `/api/socios`, `/api/admin`, `/api/accounting`, `/api/roles`, `/api/api-keys`
   - Security: Helmet, CORS, rate limiting, CSRF protection, bcrypt password hashing

3. **db (MySQL 8.0)**: Database server (port 3306)
   - Database: `abr` (configurable via `MYSQL_DATABASE`)
   - Key tables: usuarios, socios, cobrocuotas, grupos, api_keys, refresh_tokens, accounting tables
   - Sequelize ORM for data access
   - Schema tracked in `estructura.sql`

4. **web (Nginx)**: Reverse proxy and PHP frontend (ports 80/443)
   - Serves legacy PHP interface from `php/` directory
   - SSL/TLS via Let's Encrypt (Certbot)

5. **php-fpm**: PHP backend processor
   - Legacy PHP files: `lista.php`, `socio.php`, `save.php`

6. **python**: Automated database backup service
   - Main: `python/app.py`
   - Scheduled backups to Mega.nz cloud storage (cron: 9:48 AM Mon-Sat)
   - Maintains 10 most recent backups

7. **phpmyadmin**: Database administration UI (port 9000)

**Network**: All services communicate via `app_network` Docker bridge network

## Common Development Commands

### Build and Start All Services
```bash
# Quick start - rebuilds and starts all services
./rebuild_app.sh

# Manual approach
docker-compose down
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build
docker-compose up -d

# View logs
docker-compose logs -f app         # Backend API logs
docker-compose logs -f frontend    # Frontend logs
docker-compose logs -f db          # MySQL logs
```

### Backend Development (app/)
```bash
# Inside container or locally
cd app

# Install dependencies
npm install

# Run development server with auto-reload
npm run dev

# Run production server
npm start

# Run tests
npm test                    # All tests with coverage
npm run test:watch          # Watch mode
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only

# Access container
docker exec -it nodejs bash
```

### Frontend Development (frontend/)
```bash
cd frontend

# Install dependencies
npm install

# Development server with hot reload (port 3001)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run lint

# Run tests
npm test                    # Run tests in watch mode
npm run test:ui             # Tests with UI
npm run test:run            # Single run
npm run test:coverage       # Generate coverage report

# Access container
docker exec -it nextjs-frontend sh
```

### Database Operations
```bash
# Save current database schema
./save_database_structure.sh

# Fix MySQL user authentication (if needed)
./fix_db_user.sh

# Connect to MySQL
docker exec -it mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE}

# Apply migrations (from project root)
docker exec -i mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < migrations/001_create_auth_tables.sql

# Access MySQL container
docker exec -it mysql bash
```

### Testing API Endpoints
```bash
# Comprehensive API test suite
./test_app_API.sh

# Specific endpoint tests
./test_captcha.sh
./test_socios_search.sh
./test_apikey_creation.sh
```

## Key Architecture Patterns

### Authentication & Authorization
- **Three authentication methods**:
  1. JWT tokens (username/password login) - expires 1h, refresh token 7d
  2. OAuth2 (Google, GitHub, Facebook, Microsoft)
  3. API Keys (service-to-service communication)

- **Protected endpoints** require:
  - JWT: `Authorization: Bearer <token>` header
  - API Key: `X-API-Key: <key>` header

- **Role-based access control (RBAC)**:
  - 6 roles: `root`, `admin_employee`, `library_employee`, `readonly`, `printer`, `new_user`
  - Permissions stored in 3NF normalized tables (roles → roles_permissions → resources)
  - New registrations get `new_user` role (no permissions) until root approves

- **Security middleware** (app/middleware/):
  - `auth.js`: JWT validation + role authorization
  - `apiKey.js`: API key authentication
  - `csrf.js`: CSRF token validation
  - `rateLimiters.js`: Rate limiting (5 login attempts/15min, 100 API requests/15min)

### Database Design
- **ORM**: Sequelize 6.37.7 with migrations in `/migrations/`
- **Connection**: Configured via environment variables in `.env`
- **Authentication**: MySQL 8.0 uses `mysql_native_password` (run `./fix_db_user.sh` if auth fails)
- **Key models** (app/models/):
  - User, Role, ApiKey, RefreshToken (authentication)
  - Socio, Grupo, Cobrocuota (business domain)
  - Accounting tables: accounts, expenses, incomes, transfers, cash_reconciliations

### API Structure
- **RESTful design** with clear URL patterns:
  - `/api/auth/*` - Authentication (login, register, logout, refresh, change-password)
  - `/api/auth/oauth/*` - OAuth2 social login
  - `/api/tirada/*` - Fee collection queries
  - `/api/socios/*` - Member management
  - `/api/admin/*` - User/role administration
  - `/api/api-keys/*` - API key CRUD (root only)
  - `/api/accounting/*` - Financial tracking

- **Middleware chain** (app/app.js):
  1. Helmet (security headers)
  2. CORS (origin validation)
  3. Rate limiting
  4. Body parser
  5. CSRF protection (where needed)
  6. JWT/API key authentication
  7. Role authorization
  8. Route handler

### Frontend Architecture
- **React + Vite** with TypeScript strict mode
- **State management**: Zustand stores
- **UI Components**: Radix UI primitives + Tailwind CSS
- **Routing**: React Router DOM
- **API communication**: Fetch/Axios to backend at `NEXT_PUBLIC_API_URL`
- **Testing**: Vitest + React Testing Library

### Backup Strategy
- **Python service** (`python/app.py`) runs scheduled backups
- **Process**: mysqldump → bzip2 compression → Mega.nz upload
- **Retention**: Keeps 10 most recent backups
- **Schedule**: Cron job at 9:48 AM Mon-Sat
- **Local storage**: `db_bakup/` directory (gitignored)

## Environment Configuration

Critical environment variables (see `.env.example`):

**Database**:
```bash
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=abr
MYSQL_USER=<your-user>
MYSQL_PASSWORD=<strong-password>
MYSQL_ROOT_PASSWORD=<strong-root-password>
```

**JWT**:
```bash
JWT_SECRET=<random-64-char-string>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

**OAuth2** (4 providers):
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
```

**Email** (Resend recommended):
```bash
RESEND_API_KEY=...
EMAIL_FROM=noreply@yourdomain.com
```

**Security**:
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
NODE_ENV=production
```

**Backup**:
```bash
MEGA_USER=...
MEGA_PASSWORD=...
```

## Important File Locations

**Backend**:
- `app/app.js` - Express application setup (middleware, routes, error handling)
- `app/bin/www` - Server entry point
- `app/routes/` - API endpoint handlers
- `app/middleware/` - Auth, CSRF, rate limiting, sanitization
- `app/models/` - Sequelize ORM models
- `app/services/` - Business logic (email, captcha, WhatsApp)
- `app/config/` - Database + Passport OAuth configuration
- `app/test/` - Jest tests

**Frontend**:
- `frontend/src/main.tsx` - React entry point
- `frontend/src/App.tsx` - Root component
- `frontend/vite.config.ts` - Vite build configuration
- `frontend/tailwind.config.ts` - Tailwind CSS config

**Infrastructure**:
- `docker-compose.yml` - Service orchestration
- `migrations/` - Database migration SQL scripts (14 migrations)
- `estructura.sql` - Complete database schema snapshot
- `.env` - Environment variables (gitignored)

**Documentation**:
- `doc/CLAUDE.md` - **Comprehensive 445-line guide** covering detailed authentication setup, OAuth2 configuration, API key management, security features, and all API endpoints
- `doc/SECURITY_AUDIT_REPORT.md` - Security audit findings
- `doc/OAUTH_SETUP.md` - OAuth provider setup guide
- `doc/ROLES_SUMMARY.md` - RBAC quick reference
- `doc/API_KEYS_EXPLAINED.md` - Service-to-service authentication

## Security Features

- **Helmet.js**: HTTP security headers (CSP, HSTS, X-Frame-Options)
- **CORS**: Whitelist-based origin validation
- **Rate limiting**: 5 login attempts/15min, 100 API requests/15min
- **Account lockout**: 10 failed attempts = 60-minute lockout
- **Password policy**: 8+ chars, mixed case, 2+ numbers, 1+ special char
- **Bcrypt hashing**: Salt rounds = 10
- **CSRF tokens**: Synchronized token pattern
- **XSS prevention**: DOMPurify input sanitization
- **JWT expiration**: Access 1h, refresh 7d
- **API key rotation**: Root can revoke/delete keys anytime

## Default Credentials

**Initial root user** (created by migration 001):
- Username: `root`
- Password: `admin123`
- **⚠️ CHANGE IMMEDIATELY** after first login via `/api/auth/change-password`

## Access Points

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- phpMyAdmin: http://localhost:9000
- MySQL: localhost:3306
- Legacy PHP: http://localhost or https://yourdomain.com

## Key Constants

- `FEE_BY_PAGE = 8`: Records per page in paginated tirada queries (app/routes/tiradascob.js:6)

## Adding New Routes

```javascript
// JWT authentication only
router.get('/endpoint', authenticateToken, handler);

// JWT + role authorization
router.get('/root-only', authenticateToken, authorizeRoles('root'), handler);

// API key authentication
router.get('/service', authenticateApiKey, handler);

// Both JWT and API key (custom middleware)
const allowBoth = (req, res, next) => {
  if (req.headers['x-api-key']) return authenticateApiKey(req, res, next);
  return authenticateToken(req, res, next);
};
router.get('/flexible', allowBoth, handler);
```

## Testing

**Backend (Jest)**:
- Unit tests: `app/test/unit/`
- Integration tests: `app/test/integration/`
- Coverage threshold: 80%
- Run: `npm test` (inside `app/`)

**Frontend (Vitest)**:
- Tests: `frontend/src/**/*.test.tsx`
- Coverage reporting available
- Run: `npm test` (inside `frontend/`)

## Additional Documentation

For detailed information on specific topics, see:
- **Authentication setup**: doc/SETUP_AUTH.md
- **OAuth2 configuration**: doc/OAUTH_SETUP.md
- **Role permissions**: doc/ROLES_SUMMARY.md
- **API keys**: doc/API_KEYS_EXPLAINED.md
- **Security audit**: doc/SECURITY_AUDIT_REPORT.md
- **Complete guide**: doc/CLAUDE.md (445 lines covering all authentication methods, security features, and API endpoints)

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Configure `SERVER_DOMAIN` for SSL certificates
3. Run `./init-letsencrypt.sh` for SSL setup (certbot auto-renews every 12h)
4. Ensure all OAuth callback URLs use production domain
5. Use strong passwords for MySQL root/user accounts
6. Generate secure JWT_SECRET (64+ random characters)
7. Configure firewall to allow ports 80, 443, 3000, 3001, 3306
8. Set up Mega.nz credentials for automated backups
9. Monitor logs: `docker-compose logs -f`
