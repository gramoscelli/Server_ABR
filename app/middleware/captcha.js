/**
 * CAPTCHA Validation Middleware
 * Validates CAPTCHA responses for protected endpoints
 */

const { validateCaptcha } = require('../services/captchaService');

/**
 * Middleware to validate CAPTCHA
 * Expects captchaToken and captchaResponse in request body
 *
 * Usage:
 *   router.post('/login', validateCaptchaMiddleware, loginHandler);
 *
 * Request body must include:
 *   - captchaToken: The token ID received from /api/captcha/generate
 *   - captchaResponse: The user's answer to the CAPTCHA challenge
 */
function validateCaptchaMiddleware(req, res, next) {
  const { captchaToken, captchaResponse } = req.body;

  // Check if CAPTCHA is required (can be configured per environment)
  const captchaRequired = process.env.CAPTCHA_REQUIRED !== 'false';

  if (!captchaRequired) {
    // Skip validation if CAPTCHA is disabled
    return next();
  }

  if (!captchaToken || !captchaResponse) {
    return res.status(400).json({
      error: 'CAPTCHA requerido',
      message: 'Se requiere CAPTCHA para esta operación',
      captchaRequired: true
    });
  }

  const validation = validateCaptcha(captchaToken, captchaResponse);

  if (!validation.valid) {
    return res.status(400).json({
      error: 'CAPTCHA inválido',
      message: validation.error || 'El CAPTCHA es incorrecto o ha expirado',
      captchaRequired: true
    });
  }

  // CAPTCHA is valid, proceed to next middleware
  next();
}

/**
 * Optional CAPTCHA middleware - only validates if CAPTCHA fields are present
 * This is useful for endpoints where CAPTCHA is recommended but not strictly required
 */
function optionalCaptchaMiddleware(req, res, next) {
  const { captchaToken, captchaResponse } = req.body;

  // If no CAPTCHA fields are provided, skip validation
  if (!captchaToken && !captchaResponse) {
    return next();
  }

  // If only one field is provided, it's an error
  if (!captchaToken || !captchaResponse) {
    return res.status(400).json({
      error: 'CAPTCHA incompleto',
      message: 'Se requieren ambos campos: captchaToken y captchaResponse'
    });
  }

  // Both fields provided, validate
  const validation = validateCaptcha(captchaToken, captchaResponse);

  if (!validation.valid) {
    return res.status(400).json({
      error: 'CAPTCHA inválido',
      message: validation.error || 'El CAPTCHA es incorrecto o ha expirado'
    });
  }

  next();
}

module.exports = {
  validateCaptchaMiddleware,
  optionalCaptchaMiddleware
};
