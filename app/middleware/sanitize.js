/**
 * Input Sanitization Middleware
 * Prevents XSS, SQL injection, and other injection attacks
 */

const validator = require('validator');

/**
 * Sanitize a string to prevent XSS
 * Removes HTML tags, scripts, and dangerous characters
 */
function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  // Default options
  const opts = {
    allowEmpty: options.allowEmpty !== false,
    maxLength: options.maxLength || 1000,
    trim: options.trim !== false,
    ...options
  };

  // Trim whitespace
  if (opts.trim) {
    sanitized = validator.trim(sanitized);
  }

  // Check if empty after trimming
  if (!opts.allowEmpty && validator.isEmpty(sanitized)) {
    return '';
  }

  // Escape HTML entities (converts < to &lt;, > to &gt;, etc.)
  sanitized = validator.escape(sanitized);

  // Limit length
  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
  }

  // Remove null bytes (used in injection attacks)
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

/**
 * Sanitize username
 * Allows: alphanumeric, underscore, hyphen, dot
 */
function sanitizeUsername(username) {
  if (!username || typeof username !== 'string') {
    return null;
  }

  let sanitized = validator.trim(username);

  // Remove all characters except alphanumeric, underscore, hyphen, dot
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');

  // Limit length
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }

  // Must be at least 3 characters
  if (sanitized.length < 3) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  // Normalize email (lowercase, remove dots in Gmail, etc.)
  const normalized = validator.normalizeEmail(email, {
    gmail_remove_dots: false, // Keep dots (some people use them intentionally)
    outlookdotcom_remove_subaddress: false
  });

  // Validate email format
  if (!normalized || !validator.isEmail(normalized)) {
    return null;
  }

  // Escape just in case
  return validator.escape(normalized);
}

/**
 * Sanitize name fields (first name, last name, etc.)
 * Allows: letters, spaces, hyphens, apostrophes
 */
function sanitizeName(name) {
  if (!name || typeof name !== 'string') {
    return null;
  }

  let sanitized = validator.trim(name);

  // Allow only letters, spaces, hyphens, apostrophes
  sanitized = sanitized.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');

  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  if (sanitized.length < 1) {
    return null;
  }

  // Escape for safety
  return validator.escape(sanitized);
}

/**
 * Sanitize URL
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = validator.trim(url);

  // Validate URL format
  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: true
  })) {
    return null;
  }

  return trimmed;
}

/**
 * Validate password strength
 * Enforces strong password requirements:
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least 2 numbers
 * - At least 1 special character
 * - Minimum 8 characters
 * - No spaces allowed
 *
 * @param {string} password - The password to validate
 * @returns {object} { valid: boolean, message: string }
 */
function validatePassword(password) {
  // Use the comprehensive password validator utility
  const { validatePassword: validate } = require('../utils/passwordValidator');
  return validate(password);
}

/**
 * Sanitize integer
 */
function sanitizeInteger(value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  const num = parseInt(value);

  if (isNaN(num)) {
    return null;
  }

  if (num < min || num > max) {
    return null;
  }

  return num;
}

/**
 * Sanitize boolean
 */
function sanitizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return null;
}

/**
 * Sanitize JSON object recursively
 */
function sanitizeObject(obj, schema) {
  if (!obj || typeof obj !== 'object') {
    return {};
  }

  const sanitized = {};

  for (const [key, config] of Object.entries(schema)) {
    const value = obj[key];

    if (value === undefined || value === null) {
      if (config.required) {
        sanitized[key] = null;
      }
      continue;
    }

    switch (config.type) {
      case 'string':
        sanitized[key] = sanitizeString(value, config.options || {});
        break;

      case 'username':
        sanitized[key] = sanitizeUsername(value);
        break;

      case 'email':
        sanitized[key] = sanitizeEmail(value);
        break;

      case 'name':
        sanitized[key] = sanitizeName(value);
        break;

      case 'url':
        sanitized[key] = sanitizeUrl(value);
        break;

      case 'integer':
        sanitized[key] = sanitizeInteger(value, config.min, config.max);
        break;

      case 'boolean':
        sanitized[key] = sanitizeBoolean(value);
        break;

      case 'object':
        if (config.schema) {
          sanitized[key] = sanitizeObject(value, config.schema);
        }
        break;

      default:
        sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Express middleware to sanitize request body
 * Usage: router.post('/path', sanitizeBody(schema), handler)
 */
function sanitizeBody(schema) {
  return (req, res, next) => {
    if (req.body) {
      req.body = sanitizeObject(req.body, schema);
    }
    next();
  };
}

/**
 * Validate and sanitize registration data
 */
const registerSchema = {
  username: { type: 'username', required: true },
  password: { type: 'string', required: true, options: { trim: false, maxLength: 128 } },
  email: { type: 'email', required: false },
  role: { type: 'string', required: false, options: { maxLength: 20 } }
};

/**
 * Validate and sanitize login data
 */
const loginSchema = {
  username: { type: 'string', required: true, options: { maxLength: 50 } },
  password: { type: 'string', required: true, options: { trim: false, maxLength: 128 } }
};

/**
 * Validate and sanitize API key creation data
 */
const apiKeySchema = {
  name: { type: 'string', required: true, options: { maxLength: 100 } },
  userId: { type: 'integer', required: false, min: 1 },
  expiresAt: { type: 'string', required: false, options: { maxLength: 30 } }
};

module.exports = {
  sanitizeString,
  sanitizeUsername,
  sanitizeEmail,
  sanitizeName,
  sanitizeUrl,
  sanitizeInteger,
  sanitizeBoolean,
  sanitizeObject,
  sanitizeBody,
  validatePassword,
  // Pre-defined schemas
  registerSchema,
  loginSchema,
  apiKeySchema
};
