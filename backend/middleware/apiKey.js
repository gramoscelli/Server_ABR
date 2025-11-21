/**
 * API Key Authentication Middleware (Sequelize)
 * For service-to-service authentication using static API keys
 */

const crypto = require('crypto');
const { ApiKey, User, Role } = require('../models');

/**
 * Middleware to authenticate using API key from header
 * Expects header: X-API-Key: <api_key>
 * Adds apiKey object to req.apiKey on success
 */
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Clave API requerida',
      message: 'Por favor proporciona una clave API válida en el encabezado X-API-Key'
    });
  }

  try {
    // Hash the API key to compare with stored hash
    const keyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    // Find API key with associated user and role
    const apiKeyRecord = await ApiKey.findOne({
      where: { key_hash: keyHash },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'role_id'],
        include: [{
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }]
      }]
    });

    // Check if API key exists and is valid
    if (!apiKeyRecord || !apiKeyRecord.isValid()) {
      return res.status(401).json({
        error: 'Clave API inválida',
        message: 'La clave API proporcionada es inválida, ha expirado o ha sido revocada'
      });
    }

    // Update last used timestamp
    await apiKeyRecord.updateLastUsed();

    // Attach API key info to request object
    req.apiKey = {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      userId: apiKeyRecord.user_id,
      username: apiKeyRecord.user ? apiKeyRecord.user.username : null,
      role: apiKeyRecord.user && apiKeyRecord.user.role ? apiKeyRecord.user.role.name : 'root'
    };

    // Also add a user object for compatibility with JWT middleware
    // If no user is associated with the API key, treat it as a root-level service account
    if (apiKeyRecord.user) {
      req.user = {
        id: apiKeyRecord.user.id,
        username: apiKeyRecord.user.username,
        role: apiKeyRecord.user.role ? apiKeyRecord.user.role.name : 'root'
      };
    } else {
      // API key without user = system/service account with root privileges
      req.user = {
        id: null,
        username: `apikey:${apiKeyRecord.name}`,
        role: 'root'
      };
    }

    next();

  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error durante la autenticación con clave API'
    });
  }
}

/**
 * Generate a new API key
 * @returns {string} A new random API key (64 characters)
 */
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash an API key for storage
 * @param {string} apiKey - The API key to hash
 * @returns {string} SHA256 hash of the API key
 */
function hashApiKey(apiKey) {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

/**
 * Create a new API key in the database
 * @param {string} name - Name/description for the API key
 * @param {number} userId - User ID to associate with the key (optional)
 * @param {Date} expiresAt - Expiration date (optional)
 * @returns {Promise<{apiKey: string, id: number}>} The generated API key and its database ID
 */
async function createApiKey(name, userId = null, expiresAt = null) {
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);

  const newApiKey = await ApiKey.create({
    key_hash: keyHash,
    name,
    user_id: userId,
    expires_at: expiresAt
  });

  return {
    apiKey, // Return the plain key - this is the only time it will be visible!
    id: newApiKey.id
  };
}

/**
 * Revoke an API key by ID
 * @param {number} keyId - The API key database ID
 * @returns {Promise<boolean>} True if revoked successfully
 */
async function revokeApiKey(keyId) {
  const apiKey = await ApiKey.findByPk(keyId);

  if (!apiKey) {
    return false;
  }

  await apiKey.deactivate();
  return true;
}

/**
 * Delete an API key by ID
 * @param {number} keyId - The API key database ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteApiKey(keyId) {
  const result = await ApiKey.destroy({
    where: { id: keyId }
  });

  return result > 0;
}

/**
 * List all API keys for a user
 * @param {number} userId - The user ID
 * @returns {Promise<Array>} Array of API key objects (without the actual keys)
 */
async function listApiKeys(userId = null) {
  const where = userId ? { user_id: userId } : {};

  const keys = await ApiKey.findAll({
    where,
    attributes: ['id', 'name', 'user_id', 'active', 'created_at', 'expires_at', 'last_used'],
    order: [['created_at', 'DESC']]
  });

  return keys;
}

module.exports = {
  authenticateApiKey,
  generateApiKey,
  hashApiKey,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  listApiKeys
};
