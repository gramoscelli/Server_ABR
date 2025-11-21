/**
 * Middleware that accepts EITHER JWT token OR API key authentication
 * Tries API key first, falls back to JWT if no API key present
 */

const { authenticateToken } = require('./auth');
const { authenticateApiKey } = require('./apiKey');

/**
 * Authenticate using either API key or JWT token
 * Priority: API Key > JWT
 */
function authenticateEither(req, res, next) {
  // Check if API key is present
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
    // Use API key authentication
    return authenticateApiKey(req, res, next);
  } else {
    // Use JWT token authentication
    return authenticateToken(req, res, next);
  }
}

module.exports = authenticateEither;
