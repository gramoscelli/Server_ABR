/**
 * Rate Limiters Configuration
 * Separate rate limiters for different authentication endpoints
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login endpoint
 * 5 attempts per 15 minutes
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per 15 minutes
  message: {
    error: 'Too many login attempts',
    message: 'Demasiados intentos de inicio de sesión desde esta IP. Por favor, intenta nuevamente en 15 minutos.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

/**
 * Rate limiter for registration endpoint (public registration)
 * 5 attempts per 24 hours (1 day)
 * This limiter is NOT applied to admin-created users
 */
const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours (1 day)
  max: 5, // limit each IP to 5 registration attempts per day
  message: {
    error: 'Too many registration attempts',
    message: 'Demasiados intentos de registro desde esta IP. Por favor, intenta nuevamente en 24 horas.',
    retryAfter: '24 hours'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful registrations
});

/**
 * General rate limiter for other auth endpoints
 * 50 attempts per 15 minutes
 * Applied to: /api/auth/me, /api/auth/change-password, /api/auth/verify-email, etc.
 */
const generalAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per 15 minutes
  message: {
    error: 'Too many requests',
    message: 'Demasiadas solicitudes desde esta IP. Por favor, intenta nuevamente en 15 minutos.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for CSRF token endpoint
 * More permissive as it's needed for every protected request
 * 100 attempts per 15 minutes
 */
const csrfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per 15 minutes
  message: {
    error: 'Too many requests',
    message: 'Demasiadas solicitudes de tokens CSRF. Por favor, intenta nuevamente en 15 minutos.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for validation endpoints (username and password validation)
 * Very permissive as these are called in real-time while the user types
 * 150 attempts per 15 minutes
 */
const validationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 validation requests per 15 minutes
  message: {
    error: 'Too many validation requests',
    message: 'Demasiadas solicitudes de validación. Por favor, intenta nuevamente en 15 minutos.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Middleware to skip rate limiter for admin users creating accounts
 * This allows admins to create multiple user accounts without being rate limited
 */
const skipAdminRegistration = (req, res, next) => {
  // Check if this is an admin creating a user (from /api/admin/users endpoint)
  // The authenticateToken middleware should have already run and populated req.user
  if (req.user && (req.user.role === 'admin' || req.user.role === 'root')) {
    // Skip rate limiting for admin users
    return next();
  }
  // Apply rate limiting for non-admin users
  return registerLimiter(req, res, next);
};

module.exports = {
  loginLimiter,
  registerLimiter,
  generalAuthLimiter,
  csrfLimiter,
  validationLimiter,
  skipAdminRegistration
};
