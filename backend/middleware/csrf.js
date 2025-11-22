/**
 * CSRF Protection Middleware (Sequelize)
 * Implements synchronizer token pattern for CSRF protection
 *
 * This provides defense-in-depth even though JWT in Authorization headers
 * are not susceptible to CSRF. This protects against:
 * - Future cookie-based authentication
 * - Mixed authentication methods
 * - XSS attacks that steal tokens
 */

const crypto = require('crypto');
const { CsrfToken } = require('../models');

// Configuration
const CSRF_TOKEN_LENGTH = 32; // bytes (will be 64 chars in hex)
const CSRF_TOKEN_EXPIRY_HOURS = 2; // Token expires after 2 hours
const SINGLE_USE_TOKENS = false; // Set to true for one-time use tokens (more secure, less UX)

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCsrfToken() {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Middleware to generate and return a CSRF token
 * GET /api/csrf-token
 *
 * Optional: Can associate with user ID and IP for extra security
 */
async function generateToken(req, res) {
  try {
    const token = generateCsrfToken();

    // Optional: Associate with authenticated user
    const userId = req.user?.id || null;

    // Optional: Associate with IP address for extra security
    const ipAddress = req.ip || req.connection.remoteAddress;

    console.log('[CSRF] Generating token for user:', userId || 'anonymous', 'IP:', ipAddress);

    // Store token in database using Sequelize model
    const csrfToken = await CsrfToken.createToken(token, CSRF_TOKEN_EXPIRY_HOURS, {
      userId,
      ipAddress
    });

    console.log('[CSRF] Token generated:', token.substring(0, 16) + '...', 'expires:', csrfToken.expires_at);

    // Return token to client
    // Client should include this in X-CSRF-Token header for protected requests
    res.json({
      csrfToken: token,
      token, // Keep for backwards compatibility
      expiresAt: csrfToken.expires_at.toISOString(),
      expiresIn: CSRF_TOKEN_EXPIRY_HOURS * 3600 // seconds
    });

  } catch (error) {
    console.error('CSRF token generation error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo generar el token CSRF'
    });
  }
}

/**
 * Middleware to validate CSRF token
 * Checks X-CSRF-Token header against database
 */
async function validateToken(req, res, next) {
  // Skip CSRF validation for safe methods (GET, HEAD, OPTIONS)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  console.log('[CSRF] Validating token for', req.method, req.url);
  console.log('[CSRF] User:', req.user ? `ID ${req.user.id} (${req.user.username})` : 'Not authenticated');

  // Get token from header
  const token = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];

  console.log('[CSRF] Token from header:', token ? `${token.substring(0, 16)}...` : 'MISSING');

  if (!token) {
    console.log('[CSRF] ❌ Token missing');
    return res.status(403).json({
      error: 'Token CSRF faltante',
      message: 'El token CSRF es requerido. Incluye el encabezado X-CSRF-Token con tu solicitud.',
      hint: 'Obtén un token desde GET /api/csrf-token'
    });
  }

  try {
    // Validate token format (should be 64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      console.log('[CSRF] ❌ Invalid format');
      return res.status(403).json({
        error: 'Formato de token CSRF inválido',
        message: 'El token CSRF debe ser una cadena hexadecimal válida'
      });
    }

    // Get current IP
    const currentIp = req.ip || req.connection.remoteAddress;

    console.log('[CSRF] Looking for token in DB with userId:', req.user?.id);

    // Find and validate token
    const csrfToken = await CsrfToken.findValidToken(token, {
      userId: req.user?.id,
      ipAddress: null, // Don't enforce IP matching (IPs can change)
      singleUse: SINGLE_USE_TOKENS
    });

    console.log('[CSRF] Token found in DB:', csrfToken ? 'YES' : 'NO');
    if (csrfToken) {
      console.log('[CSRF] Token details - user_id:', csrfToken.user_id, 'used:', csrfToken.used, 'expires:', csrfToken.expires_at);
    }

    if (!csrfToken) {
      console.log('[CSRF] ❌ Token not found or invalid');
      return res.status(403).json({
        error: 'Token CSRF inválido',
        message: 'El token CSRF es inválido o ha expirado',
        hint: 'Obtén un nuevo token desde GET /api/csrf-token'
      });
    }

    // Check if token has expired
    if (csrfToken.isExpired()) {
      // Clean up expired token
      await csrfToken.destroy();

      console.log('[CSRF] ❌ Token expired');
      return res.status(403).json({
        error: 'Token CSRF expirado',
        message: 'El token CSRF ha expirado. Por favor solicita un nuevo token.',
        hint: 'Obtén un nuevo token desde GET /api/csrf-token'
      });
    }

    // Check if token has already been used (if single-use mode)
    if (SINGLE_USE_TOKENS && csrfToken.used) {
      console.log('[CSRF] ❌ Token already used');
      return res.status(403).json({
        error: 'Token CSRF ya utilizado',
        message: 'Este token CSRF ya ha sido utilizado. Por favor solicita un nuevo token.',
        hint: 'Obtén un nuevo token desde GET /api/csrf-token'
      });
    }

    // Optional: Validate token is associated with same user
    console.log('[CSRF] Checking user match - token.user_id:', csrfToken.user_id, 'req.user.id:', req.user?.id);
    if (csrfToken.user_id && req.user?.id && csrfToken.user_id !== req.user.id) {
      console.log('[CSRF] ❌ User ID mismatch');
      return res.status(403).json({
        error: 'Token CSRF no coincide',
        message: 'El token CSRF no es válido para este usuario'
      });
    }

    // Optional: Log IP mismatch (don't block, as IPs can change legitimately)
    if (csrfToken.ip_address && csrfToken.ip_address !== currentIp) {
      console.warn(`CSRF token IP mismatch: token IP ${csrfToken.ip_address}, request IP ${currentIp}`);
    }

    // Mark token as used if single-use mode
    if (SINGLE_USE_TOKENS) {
      await csrfToken.markAsUsed();
      console.log('[CSRF] Token marked as used');
    }

    // Token is valid - proceed with request
    req.csrfToken = csrfToken;
    console.log('[CSRF] ✅ Token validated successfully');
    next();

  } catch (error) {
    console.error('CSRF validation error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo validar el token CSRF'
    });
  }
}

/**
 * Middleware to add CSRF token to response (for forms/cookies)
 * This is optional and can be used to automatically include token in responses
 */
async function attachTokenToResponse(req, res, next) {
  try {
    // Generate token
    const token = generateCsrfToken();
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Store in database
    const csrfToken = await CsrfToken.createToken(token, CSRF_TOKEN_EXPIRY_HOURS, {
      userId,
      ipAddress
    });

    // Attach to response locals (available in templates)
    res.locals.csrfToken = token;

    // Also send in response header (for SPAs)
    res.setHeader('X-CSRF-Token', token);

    next();

  } catch (error) {
    console.error('CSRF token attachment error:', error);
    next(); // Don't block request on error
  }
}

/**
 * Clean up expired tokens (can be called manually or via cron)
 */
async function cleanupExpiredTokens() {
  try {
    const expiredCount = await CsrfToken.cleanupExpired();
    const usedCount = await CsrfToken.cleanupUsed(1); // Clean up tokens used more than 1 hour ago

    const totalCleaned = expiredCount + usedCount;
    console.log(`Cleaned up ${totalCleaned} CSRF tokens (${expiredCount} expired, ${usedCount} used)`);
    return totalCleaned;

  } catch (error) {
    console.error('CSRF cleanup error:', error);
    return 0;
  }
}

/**
 * Get CSRF statistics (for admin/monitoring)
 */
async function getCsrfStats() {
  try {
    const stats = await CsrfToken.getStats();
    return stats;

  } catch (error) {
    console.error('CSRF stats error:', error);
    return null;
  }
}

module.exports = {
  generateToken,
  validateToken,
  attachTokenToResponse,
  cleanupExpiredTokens,
  getCsrfStats,
  CSRF_TOKEN_EXPIRY_HOURS,
  SINGLE_USE_TOKENS
};
