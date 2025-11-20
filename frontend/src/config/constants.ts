// Application constants

// Password validation
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL: true,
} as const

// Username validation
export const USERNAME_REQUIREMENTS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  PATTERN: /^[a-zA-Z0-9_-]+$/,
} as const

// Email validation
export const EMAIL_REQUIREMENTS = {
  PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const

// Session
export const SESSION = {
  TOKEN_REFRESH_INTERVAL: 15 * 60 * 1000, // 15 minutes
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
} as const

// UI
export const UI = {
  DEBOUNCE_DELAY: 300, // ms
  TOAST_DURATION: 5000, // ms
  ANIMATION_DURATION: 200, // ms
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const

// File upload
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  RESEND_VERIFICATION: '/resend-verification',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  CHANGE_PASSWORD: '/change-password',
  ADMIN: {
    USERS: '/admin/users',
    ROLES: '/admin/roles',
    API_KEYS: '/admin/api-keys',
    SETTINGS: '/admin/settings',
  },
} as const

// Roles
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator',
} as const

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  VALIDATION: 'Please check your input and try again.',
} as const
