# Biblio-Server Documentation

This folder contains all documentation for the biblio-server library management system.

## 📚 Documentation Index

### Main Documentation
- **[CLAUDE.md](./CLAUDE.md)** - Main project documentation and developer guide
- **[MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md)** - 3NF migration completion report

### Role-Based Access Control (RBAC)
- **[ROLES_SUMMARY.md](./ROLES_SUMMARY.md)** - Quick reference guide for all roles
- **[ROLE_PERMISSIONS.md](./ROLE_PERMISSIONS.md)** - Comprehensive permissions matrix
- **[USER_ROLES.md](./USER_ROLES.md)** - User management guide
- **[ROLES_QUICKSTART.md](./ROLES_QUICKSTART.md)** - Quick start guide for roles

### Database & Schema
- **[SCHEMA_3NF.md](./SCHEMA_3NF.md)** - Third Normal Form schema documentation
- **[SEQUELIZE_MIGRATION.md](./SEQUELIZE_MIGRATION.md)** - Sequelize ORM migration guide

### Security
- **[SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)** - Security audit report
- **[SECURITY_FIXES_APPLIED.md](./SECURITY_FIXES_APPLIED.md)** - Security fixes documentation
- **[RATE_LIMITING.md](./RATE_LIMITING.md)** - IP-based rate limiting (5 login attempts per 15 min)
- **[BRUTE_FORCE_PROTECTION.md](./BRUTE_FORCE_PROTECTION.md)** - Account lockout protection
- **[CSRF_PROTECTION.md](./CSRF_PROTECTION.md)** - CSRF token protection
- **[XSS_PROTECTION.md](./XSS_PROTECTION.md)** - XSS prevention measures

### Setup & Configuration
- **[SETUP_AUTH.md](./SETUP_AUTH.md)** - Authentication setup guide
- **[OAUTH_SETUP.md](./OAUTH_SETUP.md)** - OAuth2 provider configuration
- **[API_KEYS_EXPLAINED.md](./API_KEYS_EXPLAINED.md)** - API keys for service-to-service auth

### Testing
- **[TEST_SCRIPT_README.md](./TEST_SCRIPT_README.md)** - API test script documentation

---

## 🚀 Quick Start

1. **For general project overview**: Start with [CLAUDE.md](./CLAUDE.md)
2. **For role management**: See [ROLES_SUMMARY.md](./ROLES_SUMMARY.md)
3. **For security features**: Check [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)
4. **For database schema**: Read [SCHEMA_3NF.md](./SCHEMA_3NF.md)

---

## 📋 Current System State

**Roles**: 4 (root, admin_employee, library_employee, new_user)
**Resources**: 5 (*, users, roles, api_keys, library_associateds)
**Database**: 3NF normalized with foreign key constraints
**Authentication**: JWT + OAuth2 (Google, GitHub, Facebook, Microsoft)
**Security**: CSRF protection, rate limiting, account lockout, XSS prevention

---

## 📖 Related Resources

- **Migrations**: See `../migrations/` folder for database migration scripts
- **API Tests**: Run `../test_app_API.sh` for automated API testing
- **Code**: Application code in `../app/` directory

---

**Last Updated**: 2025-11-08
**Migration Version**: 010
