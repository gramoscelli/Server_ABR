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

  // Accounting endpoints (double-entry bookkeeping)
  ACCOUNTING: {
    // Dashboard
    DASHBOARD: '/api/accounting/dashboard',
    DASHBOARD_MONTHLY: '/api/accounting/dashboard/monthly',

    // Cuentas Contables (chart of accounts)
    CUENTAS: '/api/accounting/cuentas',
    CUENTA_BY_ID: (id: number) => `/api/accounting/cuentas/${id}`,
    CUENTA_BY_CODIGO: (codigo: number) => `/api/accounting/cuentas/by-codigo/${codigo}`,

    // Asientos (journal entries)
    ASIENTOS: '/api/accounting/asientos',
    ASIENTO_BY_ID: (id: number) => `/api/accounting/asientos/${id}`,
    ASIENTO_CONFIRMAR: (id: number) => `/api/accounting/asientos/${id}/confirmar`,
    ASIENTO_ANULAR: (id: number) => `/api/accounting/asientos/${id}/anular`,

    // Extended accounts
    CUENTAS_EFECTIVO: '/api/accounting/cuentas-extendidas/efectivo',
    CUENTAS_BANCARIAS: '/api/accounting/cuentas-extendidas/bancarias',
    CUENTAS_PAGO_ELECTRONICO: '/api/accounting/cuentas-extendidas/pago-electronico',

    // Liquidaciones
    LIQUIDACIONES: '/api/accounting/liquidaciones',
    LIQUIDACION_ACREDITAR: (id: number) => `/api/accounting/liquidaciones/${id}/acreditar`,

    // Cash Reconciliations
    CASH_RECONCILIATIONS: '/api/accounting/cash-reconciliations',
    CASH_RECONCILIATION_BY_ID: (id: number) => `/api/accounting/cash-reconciliations/${id}`,
    CASH_RECONCILIATION_BY_DATE: (date: string) => `/api/accounting/cash-reconciliations/date/${date}`,
    CASH_RECONCILIATION_CALCULATE: (cuentaId: number, date: string) =>
      `/api/accounting/cash-reconciliations/calculate/${cuentaId}/${date}`,

    // Reports
    REPORTS: {
      LIBRO_DIARIO: '/api/accounting/reports/libro-diario',
      MAYOR: (cuentaId: number) => `/api/accounting/reports/mayor/${cuentaId}`,
      BALANCE_SUMAS_SALDOS: '/api/accounting/reports/balance-sumas-saldos',
      ESTADO_RESULTADOS: '/api/accounting/reports/estado-resultados',
      BALANCE_GENERAL: '/api/accounting/reports/balance-general',
    },
  },

  // Purchases module endpoints
  PURCHASES: {
    // Settings
    SETTINGS: '/api/purchases/settings',
    SETTING_BY_KEY: (key: string) => `/api/purchases/settings/${key}`,

    // Supplier Categories
    SUPPLIER_CATEGORIES: '/api/purchases/supplier-categories',
    SUPPLIER_CATEGORY_BY_ID: (id: number) => `/api/purchases/supplier-categories/${id}`,

    // Suppliers
    SUPPLIERS: '/api/purchases/suppliers',
    SUPPLIER_BY_ID: (id: number) => `/api/purchases/suppliers/${id}`,

    // Purchase Categories
    CATEGORIES: '/api/purchases/categories',
    CATEGORY_BY_ID: (id: number) => `/api/purchases/categories/${id}`,

    // Purchase Requests
    REQUESTS: '/api/purchases/requests',
    REQUEST_BY_ID: (id: number) => `/api/purchases/requests/${id}`,
    REQUESTS_PENDING_APPROVAL: '/api/purchases/requests/pending-approval',
    REQUEST_SUBMIT: (id: number) => `/api/purchases/requests/${id}/submit`,
    REQUEST_APPROVE: (id: number) => `/api/purchases/requests/${id}/approve`,
    REQUEST_REJECT: (id: number) => `/api/purchases/requests/${id}/reject`,
    REQUEST_CANCEL: (id: number) => `/api/purchases/requests/${id}/cancel`,
    REQUEST_GENERATE_RFQ_PDF: (id: number) => `/api/purchases/requests/${id}/generate-rfq-pdf`,
    REQUEST_SEND_RFQ_EMAIL: (id: number) => `/api/purchases/requests/${id}/send-rfq-email`,
    REQUEST_SEND_RFQ_WHATSAPP: (id: number) => `/api/purchases/requests/${id}/send-rfq-whatsapp`,

    // Quotations
    QUOTATIONS: '/api/purchases/quotations',
    QUOTATION_BY_ID: (id: number) => `/api/purchases/quotations/${id}`,
    QUOTATIONS_COMPARE: (requestId: number) => `/api/purchases/quotations/compare/${requestId}`,
    QUOTATION_SELECT: (id: number) => `/api/purchases/quotations/${id}/select`,

    // Purchase Orders
    ORDERS: '/api/purchases/orders',
    ORDER_BY_ID: (id: number) => `/api/purchases/orders/${id}`,
    ORDER_STATUS: (id: number) => `/api/purchases/orders/${id}/status`,
    ORDER_TO_EXPENSE: (id: number) => `/api/purchases/orders/${id}/to-expense`,
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
