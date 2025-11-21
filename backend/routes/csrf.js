/**
 * CSRF Management Routes
 * Admin endpoints for monitoring and managing CSRF tokens
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { getCsrfStats, cleanupExpiredTokens, CSRF_TOKEN_EXPIRY_HOURS, SINGLE_USE_TOKENS } = require('../middleware/csrf');

/**
 * GET /api/csrf/stats
 * Get CSRF token statistics (admin only)
 */
router.get('/stats', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const stats = await getCsrfStats();

    if (!stats) {
      return res.status(500).json({
        error: 'No se pudieron obtener las estadísticas'
      });
    }

    res.json({
      ...stats,
      config: {
        token_expiry_hours: CSRF_TOKEN_EXPIRY_HOURS,
        single_use_tokens: SINGLE_USE_TOKENS
      }
    });

  } catch (error) {
    console.error('CSRF stats error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las estadísticas CSRF'
    });
  }
});

/**
 * POST /api/csrf/cleanup
 * Manually trigger cleanup of expired tokens (admin only)
 */
router.post('/cleanup', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const deletedCount = await cleanupExpiredTokens();

    res.json({
      message: 'Limpieza de tokens CSRF completada',
      deleted_count: deletedCount
    });

  } catch (error) {
    console.error('CSRF cleanup error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron limpiar los tokens CSRF'
    });
  }
});

module.exports = router;
