/**
 * CAPTCHA Service
 * Generates and validates CAPTCHA challenges
 */

const svgCaptcha = require('svg-captcha');
const crypto = require('crypto');

// Store for CAPTCHA tokens (in production, use Redis or similar)
// Structure: { tokenId: { text: string, expiresAt: Date } }
const captchaStore = new Map();

// Cleanup expired captchas every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [tokenId, data] of captchaStore.entries()) {
    if (data.expiresAt < now) {
      captchaStore.delete(tokenId);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a new CAPTCHA challenge
 * @param {Object} options - Configuration options for CAPTCHA generation
 * @param {number} options.size - Number of characters (default: 6)
 * @param {number} options.noise - Noise level 1-10 (default: 3)
 * @param {string} options.color - Text color (default: true for random colors)
 * @param {string} options.background - Background color (default: '#ffffff')
 * @param {number} options.width - Image width (default: 250)
 * @param {number} options.height - Image height (default: 100)
 * @returns {Object} { tokenId: string, svg: string, expiresAt: Date }
 */
function generateCaptcha(options = {}) {
  const {
    size = 6,
    noise = 3,
    color = true,
    background = '#ffffff',
    width = 250,
    height = 100,
    ignoreChars = '0oO1ilI' // Characters that look similar
  } = options;

  // Generate CAPTCHA
  const captcha = svgCaptcha.create({
    size,
    noise,
    color,
    background,
    width,
    height,
    ignoreChars,
    charPreset: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789' // Excluding confusing chars
  });

  // Generate unique token ID
  const tokenId = crypto.randomBytes(32).toString('hex');

  // Store CAPTCHA with expiration (5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  captchaStore.set(tokenId, {
    text: captcha.text.toLowerCase(), // Store in lowercase for case-insensitive comparison
    expiresAt: expiresAt.getTime()
  });

  return {
    tokenId,
    svg: captcha.data,
    expiresAt
  };
}

/**
 * Validate CAPTCHA response
 * @param {string} tokenId - The token ID returned from generateCaptcha
 * @param {string} userResponse - The user's CAPTCHA response
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateCaptcha(tokenId, userResponse) {
  if (!tokenId || !userResponse) {
    return {
      valid: false,
      error: 'Token ID y respuesta son requeridos'
    };
  }

  // Get stored CAPTCHA
  const stored = captchaStore.get(tokenId);

  if (!stored) {
    return {
      valid: false,
      error: 'CAPTCHA inválido o expirado'
    };
  }

  // Check expiration
  if (stored.expiresAt < Date.now()) {
    captchaStore.delete(tokenId);
    return {
      valid: false,
      error: 'CAPTCHA expirado'
    };
  }

  // Validate response (case-insensitive)
  const isValid = stored.text === userResponse.toLowerCase().trim();

  // Delete token after validation (single use)
  captchaStore.delete(tokenId);

  if (!isValid) {
    return {
      valid: false,
      error: 'CAPTCHA incorrecto'
    };
  }

  return {
    valid: true
  };
}

/**
 * Generate a math CAPTCHA (alternative)
 * @returns {Object} { tokenId: string, svg: string, expiresAt: Date }
 */
function generateMathCaptcha() {
  const captcha = svgCaptcha.createMathExpr({
    mathMin: 1,
    mathMax: 20,
    mathOperator: '+',
    width: 250,
    height: 100,
    noise: 2,
    color: true,
    background: '#ffffff'
  });

  // Generate unique token ID
  const tokenId = crypto.randomBytes(32).toString('hex');

  // Store CAPTCHA with expiration (5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  captchaStore.set(tokenId, {
    text: captcha.text.toLowerCase(),
    expiresAt: expiresAt.getTime()
  });

  return {
    tokenId,
    svg: captcha.data,
    expiresAt
  };
}

/**
 * Get statistics about CAPTCHA store (for monitoring)
 * @returns {Object} { totalStored: number, expired: number }
 */
function getStats() {
  const now = Date.now();
  let expired = 0;

  for (const data of captchaStore.values()) {
    if (data.expiresAt < now) {
      expired++;
    }
  }

  return {
    totalStored: captchaStore.size,
    expired
  };
}

module.exports = {
  generateCaptcha,
  validateCaptcha,
  generateMathCaptcha,
  getStats
};
