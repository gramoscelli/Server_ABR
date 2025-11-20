# Frontend Improvements Guide

This guide demonstrates how to use the new improvements implemented in the frontend.

## Table of Contents

1. [Testing](#testing)
2. [State Management with Zustand](#state-management)
3. [API Configuration](#api-configuration)
4. [Error Boundaries](#error-boundaries)
5. [Custom Hooks](#custom-hooks)
6. [Code Splitting](#code-splitting)

---

## Testing

### Running Tests

```bash
# Watch mode (recommended during development)
npm test

# Run once
npm run test:run

# With coverage
npm run test:coverage

# With UI
npm run test:ui
```

### Writing Tests

**Component Test Example:**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<MyComponent onClick={handleClick} />)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalled()
  })
})
```

**Hook Test Example:**

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useFetch } from '@/src/hooks'

describe('useFetch', () => {
  it('fetches data successfully', async () => {
    const { result } = renderHook(() => useFetch('/api/users'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeDefined()
    expect(result.current.error).toBeNull()
  })
})
```

---

## State Management

### Using Auth Store

```typescript
import { useAuthStore } from '@/src/store'

function MyComponent() {
  // Select only what you need
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)

  // Or destructure multiple values
  const { user, isAuthenticated, setUser } = useAuthStore()

  return (
    <div>
      <p>Welcome, {user?.username}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Using App Store

```typescript
import { useAppStore } from '@/src/store'

function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore()

  return (
    <aside className={sidebarOpen ? 'open' : 'closed'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  )
}
```

### Outside React Components

```typescript
import { useAuthStore } from '@/src/store'

// In utility files, services, etc.
function someUtilityFunction() {
  const state = useAuthStore.getState()
  const user = state.user

  // Update state
  state.logout()
}
```

---

## API Configuration

### Using API Endpoints

```typescript
import { API_ENDPOINTS, HTTP_STATUS, HTTP_METHODS } from '@/src/config'

async function fetchUsers() {
  const response = await fetch(API_ENDPOINTS.ADMIN.USERS)

  if (response.status === HTTP_STATUS.OK) {
    return await response.json()
  }

  throw new Error('Failed to fetch users')
}

// Dynamic endpoints
async function deleteUser(userId: number) {
  const response = await fetch(API_ENDPOINTS.ADMIN.USER_BY_ID(userId), {
    method: HTTP_METHODS.DELETE,
  })

  return response.ok
}
```

### Using Constants

```typescript
import { PASSWORD_REQUIREMENTS, ROUTES, UI } from '@/src/config'

function PasswordInput() {
  const [password, setPassword] = useState('')
  const debouncedPassword = useDebounce(password, UI.DEBOUNCE_DELAY)

  const isValid = password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH

  return (
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      minLength={PASSWORD_REQUIREMENTS.MIN_LENGTH}
    />
  )
}
```

---

## Error Boundaries

### Component Error Boundary

```typescript
import { ErrorBoundary } from '@/src/components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to error tracking service
        console.error('Error caught:', error, errorInfo)
      }}
    >
      <MyApp />
    </ErrorBoundary>
  )
}
```

### Custom Fallback

```typescript
<ErrorBoundary
  fallback={
    <div className="error-screen">
      <h1>Oops! Something went wrong</h1>
      <button onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  }
>
  <MyComponent />
</ErrorBoundary>
```

### HOC Pattern

```typescript
import { withErrorBoundary } from '@/src/components/ErrorBoundary'

const MyComponent = () => {
  return <div>My Component</div>
}

export default withErrorBoundary(MyComponent, {
  onError: (error) => console.error(error)
})
```

---

## Custom Hooks

### useFetch Hook

```typescript
import { useFetch } from '@/src/hooks'

function UsersList() {
  const { data, loading, error, refetch } = useFetch('/api/users', {
    onSuccess: (data) => console.log('Users loaded:', data),
    onError: (error) => console.error('Failed to load users:', error),
    showErrorToast: true,
  })

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {data?.users.map(user => (
        <div key={user.id}>{user.username}</div>
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  )
}
```

### useForm Hook

```typescript
import { useForm } from '@/src/hooks'

interface LoginForm {
  username: string
  password: string
}

function LoginPage() {
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useForm<LoginForm>({
    initialValues: {
      username: '',
      password: '',
    },
    validate: (values) => {
      const errors: Partial<Record<keyof LoginForm, string>> = {}

      if (!values.username) {
        errors.username = 'Username is required'
      }

      if (values.password.length < 8) {
        errors.password = 'Password must be at least 8 characters'
      }

      return errors
    },
    onSubmit: async (values) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      })

      if (response.ok) {
        // Handle success
      }
    },
  })

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="username"
        value={values.username}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {touched.username && errors.username && (
        <span className="error">{errors.username}</span>
      )}

      <input
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {touched.password && errors.password && (
        <span className="error">{errors.password}</span>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
```

### useDebounce Hook

```typescript
import { useState } from 'react'
import { useDebounce } from '@/src/hooks'

function SearchUsers() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data } = useFetch(`/api/users?search=${debouncedSearch}`, {
    enabled: !!debouncedSearch,
  })

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search users..."
    />
  )
}
```

### useLocalStorage Hook

```typescript
import { useLocalStorage } from '@/src/hooks'

function ThemeSelector() {
  const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light')

  return (
    <div>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={removeTheme}>Reset</button>
      <p>Current theme: {theme}</p>
    </div>
  )
}
```

### useMediaQuery Hook

```typescript
import { useIsMobile, useIsDesktop } from '@/src/hooks'

function ResponsiveComponent() {
  const isMobile = useIsMobile()
  const isDesktop = useIsDesktop()

  return (
    <div>
      {isMobile && <MobileLayout />}
      {isDesktop && <DesktopLayout />}
    </div>
  )
}
```

### useAsync Hook

```typescript
import { useAsync } from '@/src/hooks'

function DeleteUserButton({ userId }: { userId: number }) {
  const { execute, loading } = useAsync(
    async (id: number) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      })
      return response.ok
    },
    {
      onSuccess: () => alert('User deleted'),
      onError: (error) => alert('Failed to delete user'),
    }
  )

  return (
    <button onClick={() => execute(userId)} disabled={loading}>
      {loading ? 'Deleting...' : 'Delete User'}
    </button>
  )
}
```

### useClickOutside Hook

```typescript
import { useRef } from 'react'
import { useClickOutside } from '@/src/hooks'

function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useClickOutside(dropdownRef, () => setIsOpen(false))

  return (
    <div ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && (
        <div className="dropdown-menu">
          <a href="#">Option 1</a>
          <a href="#">Option 2</a>
        </div>
      )}
    </div>
  )
}
```

---

## Code Splitting

### Route-based Splitting (Already Implemented)

All routes are already lazy-loaded in `App.tsx`:

```typescript
import { lazy, Suspense } from 'react'

const DashboardPage = lazy(() => import('@/src/pages/DashboardPage'))

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Suspense>
  )
}
```

### Component-based Splitting

For large components:

```typescript
import { lazy, Suspense } from 'react'

const HeavyChart = lazy(() => import('./HeavyChart'))

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart />
      </Suspense>
    </div>
  )
}
```

### Library Splitting

For large third-party libraries:

```typescript
// Instead of:
import { Editor } from 'some-heavy-editor'

// Use:
const Editor = lazy(() =>
  import('some-heavy-editor').then(module => ({
    default: module.Editor
  }))
)
```

---

## Migration Examples

### Before (localStorage directly)

```typescript
// Old way
function LoginPage() {
  const handleLogin = async (credentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })

    const data = await response.json()
    localStorage.setItem('access_token', data.accessToken)
    localStorage.setItem('user', JSON.stringify(data.user))
  }

  return <form onSubmit={handleLogin}>...</form>
}
```

### After (Zustand store)

```typescript
// New way
import { useAuthStore } from '@/src/store'

function LoginPage() {
  const { setTokens, setUser } = useAuthStore()

  const handleLogin = async (credentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })

    const data = await response.json()
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
  }

  return <form onSubmit={handleLogin}>...</form>
}
```

### Before (Manual form handling)

```typescript
// Old way
function UserForm() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    // Validate
    const newErrors = {}
    if (!username) newErrors.username = 'Required'
    if (!email) newErrors.email = 'Required'
    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      setSubmitting(false)
      return
    }

    // Submit
    await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ username, email }),
    })

    setSubmitting(false)
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### After (useForm hook)

```typescript
// New way
import { useForm } from '@/src/hooks'

function UserForm() {
  const { values, errors, handleChange, handleSubmit, isSubmitting } = useForm({
    initialValues: { username: '', email: '' },
    validate: (values) => {
      const errors = {}
      if (!values.username) errors.username = 'Required'
      if (!values.email) errors.email = 'Required'
      return errors
    },
    onSubmit: async (values) => {
      await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(values),
      })
    },
  })

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="username"
        value={values.username}
        onChange={handleChange}
      />
      {errors.username && <span>{errors.username}</span>}

      <button disabled={isSubmitting}>Submit</button>
    </form>
  )
}
```

---

## Best Practices

1. **Always use TypeScript** - Type your hooks, components, and stores
2. **Test your code** - Write tests for critical functionality
3. **Use custom hooks** - Extract reusable logic into hooks
4. **Optimize renders** - Use selectors in Zustand to prevent unnecessary re-renders
5. **Handle errors** - Wrap components with ErrorBoundary
6. **Keep components small** - Split large components into smaller ones
7. **Use constants** - Don't hardcode URLs, magic numbers, etc.
8. **Document your code** - Add JSDoc comments for complex functions

---

## Next Steps

- [ ] Add more test coverage
- [ ] Implement virtual scrolling for large lists
- [ ] Add request caching with React Query
- [ ] Implement optimistic updates
- [ ] Add analytics tracking
- [ ] Setup Storybook for component documentation
- [ ] Add E2E tests with Playwright
- [ ] Implement PWA features

For questions or issues, check the main README or create an issue in the repository.
