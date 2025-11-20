// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || '/api',
  TIMEOUT: 30000, // 30 seconds
} as const

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    VERIFY_EMAIL: '/api/auth/verify-email',
    RESEND_VERIFICATION: '/api/auth/resend-verification',
    VALIDATE_PASSWORD: '/api/auth/validate-password',
    CHANGE_PASSWORD: '/api/auth/change-password',
    ME: '/api/auth/me',
  },

  // OAuth endpoints
  OAUTH: {
    GOOGLE: '/api/oauth/google',
    GITHUB: '/api/oauth/github',
    CALLBACK: '/api/oauth/callback',
  },

  // Admin endpoints
  ADMIN: {
    USERS: '/api/admin/users',
    USER_BY_ID: (id: number) => `/api/admin/users/${id}`,
    ROLES: '/api/admin/roles',
    ROLE_BY_ID: (id: number) => `/api/admin/roles/${id}`,
    SETTINGS: '/api/admin/settings',
    STATS: '/api/admin/stats',
  },

  // API Keys endpoints
  API_KEYS: {
    LIST: '/api/api-keys',
    CREATE: '/api/api-keys',
    DELETE: (id: number) => `/api/api-keys/${id}`,
    ROTATE: (id: number) => `/api/api-keys/${id}/rotate`,
  },

  // CSRF endpoint
  CSRF: '/api/csrf-token',

  // WhatsApp endpoints (if applicable)
  WHATSAPP: {
    SEND: '/api/whatsapp/send',
    STATUS: '/api/whatsapp/status',
  },
} as const

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
} as const

// Response status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const

// Request headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const
