/**
 * API Key Management Routes
 * Admin endpoints for creating and managing API keys
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  authenticateApiKey,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  listApiKeys
} = require('../middleware/apiKey');

/**
 * GET /api/api-keys
 * List all API keys (admin only)
 * Query params: userId (optional) - filter by user ID
 */
router.get('/', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const { userId } = req.query;
    const keys = await listApiKeys(userId ? parseInt(userId) : null);

    res.json({ apiKeys: keys });

  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al listar las claves API'
    });
  }
});

/**
 * POST /api/api-keys
 * Create a new API key (admin only)
 * Body: { name: string, userId?: number, expiresAt?: string (ISO date) }
 */
router.post('/', authenticateToken, authorizeRoles('root'), async (req, res) => {
  const { name, userId, expiresAt } = req.body;

  if (!name) {
    return res.status(400).json({
      error: 'Falta el nombre',
      message: 'El nombre de la clave API es requerido'
    });
  }

  try {
    const expirationDate = expiresAt ? new Date(expiresAt) : null;

    if (expiresAt && isNaN(expirationDate.getTime())) {
      return res.status(400).json({
        error: 'Fecha inválida',
        message: 'expiresAt debe ser una cadena de fecha ISO válida'
      });
    }

    const result = await createApiKey(
      name,
      userId || null,
      expirationDate
    );

    res.status(201).json({
      message: 'Clave API creada exitosamente',
      apiKey: result.apiKey, // IMPORTANT: This is the only time the key will be shown!
      id: result.id,
      warning: '¡Guarda esta clave API ahora! ¡No podrás verla nuevamente!'
    });

  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear la clave API'
    });
  }
});

/**
 * PATCH /api/api-keys/:id/revoke
 * Revoke an API key (admin only)
 */
router.patch('/:id/revoke', authenticateToken, authorizeRoles('root'), async (req, res) => {
  const keyId = parseInt(req.params.id);

  if (isNaN(keyId)) {
    return res.status(400).json({
      error: 'ID inválido',
      message: 'El ID de la clave API debe ser un número'
    });
  }

  try {
    const success = await revokeApiKey(keyId);

    if (!success) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Clave API no encontrada'
      });
    }

    res.json({ message: 'Clave API revocada exitosamente' });

  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al revocar la clave API'
    });
  }
});

/**
 * DELETE /api/api-keys/:id
 * Delete an API key (admin only)
 */
router.delete('/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  const keyId = parseInt(req.params.id);

  if (isNaN(keyId)) {
    return res.status(400).json({
      error: 'ID inválido',
      message: 'El ID de la clave API debe ser un número'
    });
  }

  try {
    const success = await deleteApiKey(keyId);

    if (!success) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Clave API no encontrada'
      });
    }

    res.json({ message: 'Clave API eliminada exitosamente' });

  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar la clave API'
    });
  }
});

/**
 * GET /api/api-keys/verify
 * Verify an API key and return its info
 * Uses API key authentication (X-API-Key header)
 * This endpoint is specifically for testing API key validity
 */
router.get('/verify', authenticateApiKey, async (req, res) => {
  try {
    // req.apiKey is set by authenticateApiKey middleware
    const { ApiKey } = require('../models');

    // Get full API key info
    const apiKeyRecord = await ApiKey.findByPk(req.apiKey.id, {
      attributes: ['id', 'name', 'active', 'created_at', 'expires_at', 'last_used']
    });

    if (!apiKeyRecord) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Información de la clave API no disponible'
      });
    }

    res.json({
      valid: true,
      apiKey: {
        id: apiKeyRecord.id,
        name: apiKeyRecord.name,
        active: apiKeyRecord.active,
        created_at: apiKeyRecord.created_at,
        expires_at: apiKeyRecord.expires_at,
        last_used: apiKeyRecord.last_used,
        user: req.apiKey.username,
        role: req.apiKey.role
      },
      message: 'Clave API válida y activa'
    });

  } catch (error) {
    console.error('Verify API key error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al verificar la clave API'
    });
  }
});

module.exports = router;
