/**
 * Authentication Middleware
 * Provides JWT token verification and role-based authorization
 */

const jwt = require('jsonwebtoken');

// Configuration from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Validate JWT_SECRET on startup
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set!');
  console.error('The application cannot start without a secure JWT secret.');
  console.error('Please set JWT_SECRET in your .env file.');
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error('FATAL ERROR: JWT_SECRET is too weak!');
  console.error('JWT_SECRET must be at least 32 characters long.');
  console.error('Generate a strong secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

/**
 * Middleware to authenticate JWT token from Authorization header
 * Expects header: Authorization: Bearer <token>
 * Adds user object to req.user on success
 * IMPORTANT: Also validates user's active status in real-time from database
 */
function authenticateToken(req, res, next) {
  console.log('[authenticateToken] Request URL:', req.url);
  console.log('[authenticateToken] Authorization header:', req.headers['authorization']);

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('[authenticateToken] NO TOKEN - Returning 401');
    return res.status(401).json({
      error: 'Token de acceso requerido',
      message: 'Por favor proporciona un token JWT válido en el encabezado Authorization'
    });
  }

  console.log('[authenticateToken] Token found:', token.substring(0, 20) + '...');

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      console.log('[authenticateToken] JWT verification error:', err.name, err.message);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expirado',
          message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
        });
      }
      return res.status(403).json({
        error: 'Token inválido',
        message: 'El token proporcionado es inválido o está mal formado.'
      });
    }

    console.log('[authenticateToken] Token verified successfully. User:', user.username, 'Role:', user.role);

    // Check if user is active - validate from token first for quick reject
    if (user.is_active === false) {
      console.log('[authenticateToken] BLOCKED - User account is inactive (from token):', user.username);
      return res.status(403).json({
        error: 'Cuenta deshabilitada',
        message: 'Esta cuenta ha sido desactivada. Por favor contacta a un administrador.'
      });
    }

    // IMPORTANT: Also check active status in database in real-time
    // This prevents users who were deactivated AFTER getting their token from accessing the system
    try {
      const { User } = require('../models');
      const dbUser = await User.findByPk(user.id);

      console.log('[authenticateToken] Checking user in DB:', user.id, 'is_active:', dbUser ? dbUser.is_active : 'USER_NOT_FOUND');

      if (!dbUser) {
        console.log('[authenticateToken] BLOCKED - User not found in database:', user.id);
        return res.status(403).json({
          error: 'Usuario no encontrado',
          message: 'El usuario asociado a este token no existe'
        });
      }

      if (dbUser.is_active === false) {
        console.log('[authenticateToken] BLOCKED - User account is inactive (from database):', user.username);
        return res.status(403).json({
          error: 'Cuenta deshabilitada',
          message: 'Esta cuenta ha sido desactivada. Por favor contacta a un administrador.'
        });
      }

      console.log('[authenticateToken] User is active - allowing access:', user.username);

      // Attach user info to request object
      req.user = user;
      next();
    } catch (dbError) {
      console.error('[authenticateToken] Database error checking user status:', dbError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: 'Ocurrió un error al validar tu sesión'
      });
    }
  });
}

/**
 * Middleware factory to check if user has one of the allowed roles
 * Must be used after authenticateToken middleware
 *
 * Usage: authorizeRoles('admin', 'user')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticación requerida',
        message: 'Debes estar autenticado para acceder a este recurso'
      });
    }

    console.log('[authorizeRoles] User role:', req.user.role, 'Allowed roles:', allowedRoles);

    if (!allowedRoles.includes(req.user.role)) {
      console.log('[authorizeRoles] FORBIDDEN - Role mismatch');
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: `Este recurso requiere uno de los siguientes roles: ${allowedRoles.join(', ')}. Tu rol: ${req.user.role}`
      });
    }

    next();
  };
}

/**
 * Generate a new JWT access token
 * @param {Object} payload - User data to encode in token (id, username, role)
 * @returns {string} JWT token
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate a refresh token (longer expiry)
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Verify and decode a token without throwing errors
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Middleware that accepts BOTH JWT and API Key authentication
 * Tries JWT first, then falls back to API Key
 * This allows endpoints to be accessed with either method
 */
async function authenticateTokenOrApiKey(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'];

  // Try JWT first
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      return jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (!err) {
          // Check if user is active - validate from token first for quick reject
          if (user.is_active === false) {
            return res.status(403).json({
              error: 'Cuenta deshabilitada',
              message: 'Esta cuenta ha sido desactivada. Por favor contacta a un administrador.'
            });
          }

          // Also check active status in database in real-time
          try {
            const { User } = require('../models');
            const dbUser = await User.findByPk(user.id);

            if (!dbUser || dbUser.is_active === false) {
              return res.status(403).json({
                error: 'Cuenta deshabilitada',
                message: 'Esta cuenta ha sido desactivada. Por favor contacta a un administrador.'
              });
            }

            req.user = user;
            return next();
          } catch (dbError) {
            console.error('[authenticateTokenOrApiKey] Database error:', dbError);
            return res.status(500).json({
              error: 'Error interno del servidor',
              message: 'Ocurrió un error al validar tu sesión'
            });
          }
        }
        // JWT failed, try API key if available
        if (apiKey) {
          return tryApiKeyAuth(req, res, next);
        }
        // No API key, return JWT error
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Token expirado',
            message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
          });
        }
        return res.status(403).json({
          error: 'Token inválido',
          message: 'El token proporcionado es inválido o está mal formado.'
        });
      });
    }
  }

  // No JWT, try API key
  if (apiKey) {
    return tryApiKeyAuth(req, res, next);
  }

  // No authentication provided
  return res.status(401).json({
    error: 'Autenticación requerida',
    message: 'Por favor proporciona un token JWT (Authorization: Bearer <token>) o una clave API (X-API-Key: <key>)'
  });
}

/**
 * Helper function to try API key authentication
 */
async function tryApiKeyAuth(req, res, next) {
  const { authenticateApiKey } = require('./apiKey');
  return authenticateApiKey(req, res, next);
}

module.exports = {
  authenticateToken,
  authenticateTokenOrApiKey,
  authorizeRoles,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN
};
