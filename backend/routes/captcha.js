/**
 * CAPTCHA Routes
 * Handles CAPTCHA generation for authentication endpoints
 */

const express = require('express');
const router = express.Router();
const { generateCaptcha, generateMathCaptcha, getStats } = require('../services/captchaService');
const rateLimit = require('express-rate-limit');

// Rate limiter for CAPTCHA generation
// More permissive than auth endpoints since users may need multiple attempts
const captchaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Has solicitado demasiados CAPTCHAs. Por favor espera antes de intentar nuevamente.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * GET /api/captcha/generate
 * Generate a new CAPTCHA challenge
 *
 * Query params:
 *   - type: 'text' | 'math' (default: 'text')
 *   - size: number of characters (default: 6, only for text type)
 *
 * Returns: { tokenId: string, svg: string, expiresAt: Date }
 */
router.get('/generate', captchaLimiter, (req, res) => {
  try {
    const { type = 'text', size = 6 } = req.query;

    let captcha;
    if (type === 'math') {
      captcha = generateMathCaptcha();
    } else {
      // Text CAPTCHA with configurable size
      const captchaSize = Math.min(Math.max(parseInt(size) || 6, 4), 8); // Between 4-8 chars
      captcha = generateCaptcha({ size: captchaSize });
    }

    res.json({
      tokenId: captcha.tokenId,
      svg: captcha.svg,
      expiresAt: captcha.expiresAt,
      type: type === 'math' ? 'math' : 'text'
    });

  } catch (error) {
    console.error('CAPTCHA generation error:', error);
    res.status(500).json({
      error: 'Error generando CAPTCHA',
      message: 'Ocurrió un error al generar el CAPTCHA. Por favor intenta nuevamente.'
    });
  }
});

/**
 * GET /api/captcha/stats
 * Get CAPTCHA statistics (for monitoring/debugging)
 * This endpoint should be protected in production
 *
 * Returns: { totalStored: number, expired: number }
 */
router.get('/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (error) {
    console.error('CAPTCHA stats error:', error);
    res.status(500).json({
      error: 'Error obteniendo estadísticas',
      message: 'Ocurrió un error al obtener las estadísticas de CAPTCHA'
    });
  }
});

module.exports = router;
