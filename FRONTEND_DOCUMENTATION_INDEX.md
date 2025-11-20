# Frontend Documentation Index

This document serves as an index to all frontend-related documentation for the Biblio-Server project.

## Quick Navigation

### 1. Setup & Getting Started
- **File**: `FRONTEND_SETUP.md`
- **Contents**: Initial setup instructions, architecture overview, CORS configuration, environment variables
- **Best for**: First-time setup, understanding the system architecture

### 2. Completion Guide
- **File**: `FRONTEND_COMPLETION_GUIDE.md`
- **Contents**: Step-by-step instructions for building a complete frontend, code templates, Docker configuration
- **Best for**: Following along with implementation, copy-paste code examples

### 3. Code Reference
- **File**: `FRONTEND_CODE_REFERENCE.md`
- **Contents**: Actual code snippets of all implemented files, key patterns, backend API endpoints
- **Best for**: Understanding current implementation, copy existing code patterns

### 4. Frontend Analysis
- **File**: `frontend_analysis.md`
- **Contents**: Comprehensive analysis of current state, gaps, missing features, security assessment, recommendations
- **Best for**: Understanding what's complete and what's missing, planning next steps

### 5. Quick Summary
- **File**: `frontend_summary.txt`
- **Contents**: One-page reference with technology stack, pages status, security features, next steps, timeline
- **Best for**: Quick lookups, printing as reference, briefing others

### 6. Structure Diagram
- **File**: `FRONTEND_STRUCTURE_DIAGRAM.txt`
- **Contents**: Visual directory structure, file-by-file status, components to create, API route usage
- **Best for**: Understanding file organization, seeing what needs to be built

## Current Status Summary

- **Overall Completion**: ~20% Complete
- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4.1.17
- **Authentication**: JWT with HTTP-only cookies
- **Pages Complete**: 
  - Login (/login) - Full featured
  - Dashboard (/dashboard) - Read-only users table
- **Pages Missing**: Admin user/role/API key management pages
- **Components**: No reusable components yet (inline Tailwind only)

## Quick Facts

### What Works
- Secure authentication system with CSRF protection
- Login/logout flow
- Basic user listing dashboard
- Backend API fully implemented

### What's Missing
- Route middleware for automatic protection
- Reusable UI components
- Admin management pages (users, roles, API keys)
- Form validation and handling
- Toast notification system
- Data table features (pagination, filtering, sorting)

## For Different User Types

### If you want to...

**Understand the current state**: Read `frontend_analysis.md` or `frontend_summary.txt`

**Copy existing code**: Look at `FRONTEND_CODE_REFERENCE.md`

**Set up locally**: Follow `FRONTEND_SETUP.md`

**Build missing features**: Use `FRONTEND_COMPLETION_GUIDE.md` + `FRONTEND_STRUCTURE_DIAGRAM.txt`

**Get a quick overview**: Check `frontend_summary.txt`

**See directory structure**: Review `FRONTEND_STRUCTURE_DIAGRAM.txt`

## Development Priority Order

### Phase 1: Foundation (5-7 days)
1. Create `middleware.ts` for route protection
2. Build basic UI components (Button, Card, Modal, Alert)
3. Create sidebar layout component
4. Implement token refresh mechanism

### Phase 2: Core Features (10-15 days)
1. User management page with full CRUD
2. Role management page
3. API keys management page
4. Admin dashboard with statistics

### Phase 3: Polish (7-10 days)
1. Data table pagination, filtering, sorting
2. Form validation
3. Toast notification system
4. Loading states and skeletons

### Phase 4: Advanced (10-15 days)
1. OAuth UI integration
2. Activity logs viewer
3. Audit trail
4. Dark mode support

## Key Files to Know

### Frontend Source Code
```
/home/gustavo/biblio-server/frontend/
├── app/
│   ├── api/auth/login/route.ts
│   ├── api/auth/logout/route.ts
│   ├── api/csrf-token/route.ts
│   ├── api/admin/users/route.ts
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/ (EMPTY - needs creation)
├── lib/ (EMPTY - needs creation)
└── package.json
```

### Backend Reference (for integration)
```
/home/gustavo/biblio-server/app/
├── routes/admin.js        (User management endpoints)
├── routes/roles.js        (Role management endpoints)
├── routes/apiKeys.js      (API key endpoints)
├── middleware/auth.js     (Authentication)
└── models/
    ├── User.js
    ├── Role.js
    └── ApiKey.js
```

### Configuration
```
/home/gustavo/biblio-server/frontend/
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Environment Variables

For local development (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
BACKEND_API_URL=http://app:3000
```

For Docker:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
BACKEND_API_URL=http://app:3000
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key
SESSION_COOKIE_NAME=biblio_session
```

## Development Commands

```bash
# Install dependencies
cd /home/gustavo/biblio-server/frontend
npm install

# Development server (port 3001)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

## Architecture Overview

```
Browser (Client)
    ↓
Next.js Server (Port 3001)
    ├─ Handles authentication
    ├─ Stores tokens in HTTP-only cookies
    ├─ Proxies API calls to backend
    └─ Renders React components
    ↓
Express Backend (Port 3000)
    ├─ Validates JWT tokens
    ├─ Enforces CSRF protection
    ├─ Handles business logic
    └─ Manages database
    ↓
MySQL Database
```

## Security Architecture

- **Frontend**: Can't access tokens (HTTP-only cookies)
- **Cookies**: Secure flag enabled in production
- **CSRF**: Token required for state-changing operations
- **JWT**: 1-hour expiration for access token, 7-day for refresh
- **Rate Limiting**: 5 auth attempts per 15 minutes
- **Authorization**: Roles enforced on backend (admin, user, readonly)

## Recommended Next Steps

1. **Start with Phase 1 Foundation**
   - Create middleware.ts
   - Build Button, Card components
   - Implement sidebar layout
   - Add token refresh logic

2. **Reference Materials**
   - Use FRONTEND_CODE_REFERENCE.md for code patterns
   - Check FRONTEND_STRUCTURE_DIAGRAM.txt for file organization
   - Follow FRONTEND_COMPLETION_GUIDE.md for step-by-step

3. **Testing**
   - Test login flow first
   - Verify API proxying works
   - Test token refresh
   - Test protected routes

4. **Common Patterns**
   - Always fetch CSRF token before mutations
   - Check for 401 response to redirect to login
   - Use `'use client'` for interactive components
   - Handle loading and error states

## Useful Technologies

### Already Installed
- Next.js 15
- React 18
- TypeScript 5
- Tailwind CSS 4
- @tailwindcss/forms

### Recommended to Add
- @headlessui/react - UI components
- lucide-react - Icons
- react-hook-form - Form management
- zod - Form validation
- react-hot-toast - Notifications
- @tanstack/react-table - Advanced tables

## Backend API Summary

### Currently Used in Frontend
```
✅ GET    /api/csrf-token          - Get CSRF token
✅ POST   /api/auth/login          - Login
✅ POST   /api/auth/logout         - Logout
✅ GET    /api/admin/users         - List all users
```

### Available but Not Used
```
❌ GET    /api/admin/users/locked
❌ POST   /api/admin/users/:id/unlock
❌ PATCH  /api/admin/users/:id/reset-attempts
❌ GET    /api/roles
❌ GET    /api/roles/stats
❌ PUT    /api/roles/user/:id
❌ GET    /api/api-keys
❌ POST   /api/api-keys
❌ PUT    /api/api-keys/:id
❌ DELETE /api/api-keys/:id
```

## Troubleshooting Links

### Common Issues
- **Port already in use**: Kill process on 3001 or change in dev script
- **CORS errors**: Check ALLOWED_ORIGINS in backend .env
- **Cookie not saving**: Ensure both frontend and backend use same domain
- **401 Unauthorized**: Token may be expired, check token refresh implementation

## Support & Documentation

- Next.js Docs: https://nextjs.org/docs
- React Docs: https://react.dev
- Tailwind Docs: https://tailwindcss.com
- TypeScript Docs: https://www.typescriptlang.org/docs

## File Statistics

- **Total Documentation Lines**: ~2,400
- **Code Reference Lines**: ~600
- **Analysis Lines**: ~370
- **Structure Diagram Lines**: ~380
- **Setup Guide Lines**: ~280
- **Completion Guide Lines**: ~880

## Last Updated

November 11, 2025

## Contact & Questions

For questions about the implementation, refer to:
1. The relevant documentation file above
2. The code examples in FRONTEND_CODE_REFERENCE.md
3. The backend API documentation in app/ routes files

---

**Happy coding!** Start with Phase 1 Foundation and refer back to these documents as needed.
