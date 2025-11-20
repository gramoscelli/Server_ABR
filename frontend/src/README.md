# Frontend Source Code Documentation

## Overview

This frontend application is built with React, TypeScript, and Vite, featuring modern development practices including state management, testing, and code splitting.

## Recent Improvements (2025)

### 1. Testing Framework

**Setup:**
- Vitest with React Testing Library
- jsdom for DOM simulation
- Testing utilities configured

**Scripts:**
```bash
npm test              # Run tests in watch mode
npm run test:ui       # Run tests with UI
npm run test:run      # Run tests once
npm run test:coverage # Generate coverage report
```

**Example test:** See `src/components/ui/button.test.tsx`

### 2. State Management (Zustand)

**Stores:**
- `authStore`: Manages authentication state (user, tokens)
- `appStore`: Manages application state (sidebar, theme, loading, errors)

**Usage:**
```typescript
import { useAuthStore } from '@/src/store'

// In a component
const { user, logout } = useAuthStore()

// Outside components
const state = useAuthStore.getState()
```

### 3. API Configuration

**Location:** `src/config/api.ts` and `src/config/constants.ts`

**Features:**
- Centralized endpoint definitions
- HTTP methods and status codes constants
- Application constants (validation rules, routes, etc.)

**Usage:**
```typescript
import { API_ENDPOINTS, HTTP_STATUS } from '@/src/config'

const response = await fetch(API_ENDPOINTS.AUTH.LOGIN)
if (response.status === HTTP_STATUS.OK) { /* ... */ }
```

### 4. Error Boundaries

**Components:**
- `ErrorBoundary`: Catches React component errors
- `RouteErrorBoundary`: Handles route-level errors

**Usage:**
```typescript
// Wrap components
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// HOC pattern
const SafeComponent = withErrorBoundary(YourComponent)
```

### 5. Custom Hooks

**Available hooks:**

| Hook | Purpose | Example |
|------|---------|---------|
| `useFetch` | Fetch data with auth | `const { data, loading } = useFetch('/api/users')` |
| `useForm` | Form state management | `const { values, handleSubmit } = useForm({ ... })` |
| `useDebounce` | Debounce values | `const debouncedSearch = useDebounce(searchTerm, 300)` |
| `useLocalStorage` | localStorage with hooks | `const [value, setValue] = useLocalStorage('key', default)` |
| `useMediaQuery` | Responsive design | `const isMobile = useIsMobile()` |
| `useAsync` | Async operations | `const { execute, loading } = useAsync(asyncFn)` |
| `useClickOutside` | Click outside detection | `useClickOutside(ref, handleClose)` |

### 6. Code Splitting

All route components are lazy-loaded for optimal performance:

```typescript
const DashboardPage = lazy(() => import('@/src/pages/DashboardPage'))
```

**Benefits:**
- Smaller initial bundle size
- Faster initial page load
- On-demand loading of route components

## Directory Structure

```
src/
├── components/        # Reusable components
│   ├── ui/           # Shadcn/ui components
│   ├── ErrorBoundary.tsx
│   ├── RouteErrorBoundary.tsx
│   ├── ProtectedRoute.tsx
│   └── AdminLayout.tsx
├── config/           # Configuration files
│   ├── api.ts       # API endpoints
│   └── constants.ts # Application constants
├── hooks/            # Custom React hooks
│   ├── useFetch.ts
│   ├── useForm.ts
│   ├── useDebounce.ts
│   └── ...
├── lib/              # Utilities and services
│   ├── auth.ts      # Authentication service
│   └── utils.ts     # Utility functions
├── pages/            # Page components
│   ├── admin/       # Admin pages
│   ├── LoginPage.tsx
│   └── ...
├── store/            # Zustand stores
│   ├── authStore.ts
│   └── appStore.ts
├── test/             # Test utilities
│   └── setup.ts     # Test setup
├── App.tsx           # Main app component with routing
└── main.tsx          # Application entry point
```

## Development Guidelines

### Testing

Write tests for:
- UI components (especially reusable ones)
- Custom hooks
- Utility functions
- Complex business logic

### State Management

- Use `authStore` for authentication state
- Use `appStore` for UI state (sidebar, theme, etc.)
- Use local state (`useState`) for component-specific state
- Use custom hooks for reusable stateful logic

### Error Handling

- Wrap route components with `ErrorBoundary`
- Use `RouteErrorBoundary` for route-specific errors
- Display user-friendly error messages
- Log errors in production for debugging

### Code Splitting

- All route components should be lazy-loaded
- Large components (>50KB) should be split
- Third-party libraries should be code-split when possible

### API Calls

- Use `API_ENDPOINTS` for all API calls
- Use `fetchWithAuth()` for authenticated requests
- Use `useFetch()` hook for declarative data fetching
- Handle loading and error states properly

### Forms

- Use `useForm()` hook for form management
- Validate on blur and submit
- Show validation errors clearly
- Disable submit button while submitting

### Styling

- Use Tailwind CSS utility classes
- Use `cn()` helper for conditional classes
- Follow mobile-first responsive design
- Use Shadcn/ui components for consistency

## Performance

### Implemented Optimizations

1. **Code Splitting**: Lazy loading for all routes
2. **Memoization**: Ready to use with custom hooks
3. **Debouncing**: Built-in with `useDebounce` hook
4. **State Management**: Zustand for efficient re-renders
5. **Bundle Size**: Optimized with Vite

### Future Optimizations

- Virtual scrolling for long lists
- Image optimization with lazy loading
- Service worker for offline support
- Bundle analysis and size reduction

## Security

- CSRF protection on mutations
- JWT with refresh tokens
- Protected routes with authentication
- Input validation on client and server
- XSS prevention with React

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vite.dev/guide/)
- [Vitest Documentation](https://vitest.dev)
- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [React Router](https://reactrouter.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn/ui](https://ui.shadcn.com)
