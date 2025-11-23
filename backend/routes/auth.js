/**
 * Authentication Routes (Sequelize)
 * Handles user login, registration, token refresh, and logout
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticateToken
} = require('../middleware/auth');
const {
  sanitizeBody,
  registerSchema,
  loginSchema,
  validatePassword
} = require('../middleware/sanitize');
const { User, RefreshToken, Role } = require('../models');
const { loginLimiter, registerLimiter, generalAuthLimiter, validationLimiter } = require('../middleware/rateLimiters');
const { validateCaptchaMiddleware } = require('../middleware/captcha');

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 *
 * Body: { username: string, password: string }
 * Returns: { accessToken: string, refreshToken: string, user: object }
 */
router.post('/login', loginLimiter, sanitizeBody(loginSchema), async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'Credenciales faltantes',
      message: 'Se requieren nombre de usuario y contraseña'
    });
  }

  try {
    // Find user by username (include role)
    const user = await User.findOne({
      where: { username },
      include: [{ model: Role, as: 'role' }]
    });

    // Use timing-safe comparison to prevent username enumeration
    // Always perform password hash comparison even if user doesn't exist
    const userExists = user !== null;

    // Dummy hash to compare against if user doesn't exist (prevents timing attacks)
    const dummyHash = '$2a$10$' + 'X'.repeat(53);
    const hashToCompare = userExists ? user.password_hash : dummyHash;

    // Check account lockout BEFORE password verification
    if (userExists && user.isLocked()) {
      const minutesLeft = user.getLockTimeRemaining();
      return res.status(403).json({
        error: 'Account locked',
        message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${minutesLeft} minute(s).`,
        locked_until: user.locked_until,
        retry_after_minutes: minutesLeft
      });
    }

    // Check if user is active
    if (userExists && !user.is_active) {
      return res.status(403).json({
        error: 'Cuenta deshabilitada',
        message: 'Esta cuenta ha sido desactivada. Por favor contacta a un administrador.'
      });
    }

    // Check if email is verified (skip for OAuth users)
    if (userExists && !user.oauth_only && !user.email_verified) {
      return res.status(403).json({
        error: 'Email no verificado',
        message: 'Por favor verifica tu dirección de email antes de iniciar sesión. Revisa tu bandeja de entrada para el enlace de verificación.',
        emailNotVerified: true,
        email: user.email
      });
    }

    // Verify password (always perform comparison for timing safety)
    const validPassword = await bcrypt.compare(password, hashToCompare);

    // Handle failed login
    if (!userExists || !validPassword) {
      if (userExists) {
        // Increment failed attempts (max 10 attempts, 60 min lockout)
        const attempts = await user.incrementFailedAttempts(10, 60);

        if (attempts >= 10) {
          const remainingMinutes = user.getLockTimeRemaining();
          return res.status(403).json({
            error: 'Account locked',
            message: `Account locked due to 10 failed login attempts. Please try again in ${remainingMinutes} minutes.`,
            locked_until: user.locked_until,
            retry_after_minutes: remainingMinutes
          });
        }
      }

      // Generic error message (same for both invalid username and invalid password)
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'El nombre de usuario o la contraseña son incorrectos'
      });
    }

    // Successful login - reset failed attempts and update last login
    await user.resetFailedAttempts();

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role.name  // Get role name from associated Role model
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token hash in database
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await RefreshToken.create({
      user_id: user.id,
      token: refreshTokenHash,
      expires_at: expiresAt
    });

    // Return tokens and user info (without password hash)
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role.name,  // Return role name
        email: user.email,
        must_change_password: user.must_change_password || false
      },
      mustChangePassword: user.must_change_password || false  // Keep for backward compatibility
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error durante la autenticación'
    });
  }
});

/**
 * POST /api/auth/register
 * Register a new user
 *
 * Body: { username: string, password: string, email: string, role?: string, captchaToken: string, captchaResponse: string }
 * Returns: { message: string, userId: number }
 */
router.post('/register', registerLimiter, validateCaptchaMiddleware, sanitizeBody(registerSchema), async (req, res) => {
  const { username, password, email, role } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({
      error: 'Credenciales faltantes',
      message: 'Se requieren nombre de usuario, contraseña y email'
    });
  }

  // Additional validation after sanitization
  if (!username || username.length < 3) {
    return res.status(400).json({
      error: 'Nombre de usuario inválido',
      message: 'El nombre de usuario debe tener al menos 3 caracteres y contener solo letras, números, guión bajo, guión o punto'
    });
  }

  if (!email.includes('@')) {
    return res.status(400).json({
      error: 'Email inválido',
      message: 'Por favor proporciona una dirección de email válida'
    });
  }

  // Password strength validation (user-friendly for non-technical users)
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      error: 'Contraseña débil',
      message: passwordValidation.message
    });
  }

  // Only allow root role to be set by existing root users
  // New registrations get 'new_user' role by default (no permissions)
  const userRole = role || 'new_user';
  if (userRole === 'root' || userRole === 'library_employee' || userRole === 'admin_employee') {
    return res.status(403).json({
      error: 'Prohibido',
      message: 'No puedes auto-asignarte roles privilegiados. Los nuevos usuarios reciben el rol "new_user" y requieren aprobación del administrador para permisos elevados.'
    });
  }

  try {
    // Get the new_user role
    const newUserRole = await Role.findByName('new_user');
    if (!newUserRole) {
      return res.status(500).json({
        error: 'Error de configuración del servidor',
        message: 'No se encontró el rol new_user. Por favor contacta al administrador.'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({
        error: 'Email ya existe',
        message: 'Este email ya está registrado'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate email verification token
    const { generateVerificationToken, sendVerificationEmail } = require('../services/emailService');
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    // Insert new user with new_user role (no permissions)
    const newUser = await User.create({
      username,
      password_hash: passwordHash,
      email,
      role_id: newUserRole.id,
      email_verified: false,
      email_verification_token: verificationToken,
      email_verification_expires: verificationExpires
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken, username);

    res.status(201).json({
      message: 'Usuario creado exitosamente. Por favor revisa tu email para verificar tu cuenta.',
      userId: newUser.id,
      emailSent: true
    });

  } catch (error) {
    // Handle unique constraint violation (duplicate username)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Nombre de usuario ya existe',
        message: 'Este nombre de usuario ya está en uso'
      });
    }
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error durante el registro'
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify user email with token
 *
 * Body: { token: string }
 * Returns: { message: string, verified: boolean }
 */
router.post('/verify-email', generalAuthLimiter, async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      error: 'Token faltante',
      message: 'Se requiere el token de verificación'
    });
  }

  try {
    // Find user with this verification token
    const user = await User.findOne({
      where: {
        email_verification_token: token
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Token inválido',
        message: 'El token de verificación es inválido o ya ha sido usado'
      });
    }

    // Check if token is expired
    if (user.email_verification_expires && new Date() > new Date(user.email_verification_expires)) {
      return res.status(400).json({
        error: 'Token expirado',
        message: 'El token de verificación ha expirado. Por favor solicita uno nuevo.'
      });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(200).json({
        message: 'Email ya verificado',
        verified: true,
        alreadyVerified: true
      });
    }

    // Verify the email
    user.email_verified = true;
    user.email_verification_token = null;
    user.email_verification_expires = null;
    await user.save();

    res.json({
      message: '¡Email verificado exitosamente! Ya puedes iniciar sesión.',
      verified: true
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error durante la verificación del email'
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 *
 * Body: { email: string }
 * Returns: { message: string }
 */
router.post('/resend-verification', generalAuthLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Email faltante',
      message: 'Se requiere la dirección de email'
    });
  }

  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        message: 'Si este email está registrado, se ha enviado un email de verificación.'
      });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({
        error: 'Ya verificado',
        message: 'Este email ya está verificado'
      });
    }

    // Generate new verification token
    const { generateVerificationToken, sendVerificationEmail } = require('../services/emailService');
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    // Update user with new token
    user.email_verification_token = verificationToken;
    user.email_verification_expires = verificationExpires;
    await user.save();

    // Send verification email
    await sendVerificationEmail(email, verificationToken, user.username);

    res.json({
      message: 'Email de verificación enviado. Por favor revisa tu bandeja de entrada.'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al enviar el email de verificación'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 *
 * Body: { refreshToken: string }
 * Returns: { accessToken: string }
 */
router.post('/refresh', generalAuthLimiter, async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Token faltante',
      message: 'Se requiere el refresh token'
    });
  }

  try {
    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        error: 'Token inválido',
        message: 'El refresh token es inválido o ha expirado'
      });
    }

    // Check if refresh token exists in database
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const tokenRecord = await RefreshToken.findValidToken(refreshTokenHash, decoded.id);

    if (!tokenRecord) {
      return res.status(401).json({
        error: 'Token inválido',
        message: 'El refresh token es inválido o ha sido revocado'
      });
    }

    // Generate new access token
    const tokenPayload = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };

    const accessToken = generateAccessToken(tokenPayload);

    res.json({ accessToken });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error durante la actualización del token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user by invalidating refresh token
 * Requires authentication
 * No rate limiting - protected by JWT authentication
 *
 * Body: { refreshToken: string }
 * Returns: { message: string }
 */
router.post('/logout', authenticateToken, async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Token faltante',
      message: 'Se requiere el refresh token'
    });
  }

  try {
    // Delete refresh token from database
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const revoked = await RefreshToken.revokeToken(refreshTokenHash, req.user.id);

    if (revoked) {
      res.json({ message: 'Sesión cerrada exitosamente' });
    } else {
      res.json({ message: 'Token ya revocado o no encontrado' });
    }

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al cerrar sesión'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 * Requires authentication
 * No rate limiting - protected by JWT authentication
 *
 * Returns: { user: object }
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Role, as: 'role' }],
      attributes: ['id', 'username', 'email', 'nombre', 'apellido', 'whatsapp', 'is_active', 'oauth_only', 'avatar_url', 'created_at', 'last_login', 'must_change_password']
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario autenticado ya no existe'
      });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        whatsapp: user.whatsapp,
        role: user.role ? user.role.name : 'unknown',
        is_active: user.is_active,
        oauth_only: user.oauth_only,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        last_login: user.last_login,
        must_change_password: user.must_change_password || false
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener la información del usuario'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 * Requires authentication
 * No rate limiting - protected by JWT authentication
 *
 * Body: { currentPassword: string, newPassword: string }
 * Returns: { message: string }
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validate new password is provided
  if (!newPassword) {
    return res.status(400).json({
      error: 'Credenciales faltantes',
      message: 'Se requiere la nueva contraseña'
    });
  }

  // Password strength validation (user-friendly for non-technical users)
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      error: 'Contraseña débil',
      message: passwordValidation.message
    });
  }

  try {
    // Get current user
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario autenticado ya no existe'
      });
    }

    // If user must change password, allow password change without current password verification
    // This is for forced password changes by admin
    if (!user.must_change_password) {
      // Verify current password only if it's not a forced change
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Credenciales faltantes',
          message: 'Se requiere la contraseña actual'
        });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

      if (!validPassword) {
        return res.status(401).json({
          error: 'Contraseña inválida',
          message: 'La contraseña actual es incorrecta'
        });
      }
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear must_change_password flag
    user.password_hash = newPasswordHash;
    user.must_change_password = false;
    await user.save();

    // Invalidate all refresh tokens for this user (force re-login on all devices)
    await RefreshToken.revokeAllForUser(req.user.id);

    // Get role for response
    const userWithRole = await User.findByPk(req.user.id, {
      include: [{ model: Role, as: 'role' }],
      attributes: ['id', 'username', 'email', 'nombre', 'apellido', 'must_change_password']
    });

    res.json({
      message: 'Contraseña cambiada exitosamente. Por favor inicia sesión nuevamente.',
      user: {
        id: userWithRole.id,
        username: userWithRole.username,
        email: userWithRole.email,
        nombre: userWithRole.nombre,
        apellido: userWithRole.apellido,
        role: userWithRole.role ? userWithRole.role.name : 'unknown',
        must_change_password: false
      }
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al cambiar la contraseña'
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile information
 * Requires authentication
 * No rate limiting - protected by JWT authentication
 *
 * NOTE: Users CANNOT change their email address for security reasons.
 * Only administrators can change user emails via /api/admin/users/:userId
 *
 * Body: { nombre?: string, apellido?: string, whatsapp?: string }
 * Returns: { message: string, user: object }
 */
router.put('/profile', authenticateToken, async (req, res) => {
  const { nombre, apellido, email, whatsapp } = req.body;

  try {
    // Get current user with role
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario autenticado ya no existe'
      });
    }

    // Block email changes - users cannot change their own email
    if (email && email !== user.email) {
      return res.status(403).json({
        error: 'Prohibido',
        message: 'No puedes cambiar tu dirección de email. Por favor contacta a un administrador si necesitas actualizar tu email.'
      });
    }

    // Validate WhatsApp format if provided (E.164 format)
    if (whatsapp && !/^\+?[1-9]\d{1,14}$/.test(whatsapp)) {
      return res.status(400).json({
        error: 'Número de WhatsApp inválido',
        message: 'El número de WhatsApp debe estar en formato internacional (ej: +1234567890)'
      });
    }

    // Update only provided fields (excluding email)
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre || null;
    if (apellido !== undefined) updates.apellido = apellido || null;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp || null;

    // Apply updates
    await user.update(updates);

    // Return updated user info (without sensitive data)
    res.json({
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        whatsapp: user.whatsapp,
        role: user.role.name,
        oauth_only: user.oauth_only,
        avatar_url: user.avatar_url
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar el perfil'
    });
  }
});

/**
 * GET /api/auth/password-requirements
 * Get password requirements and validation rules
 * Public endpoint - no authentication required
 */
router.get('/password-requirements', generalAuthLimiter, (req, res) => {
  try {
    const { getPasswordRequirements } = require('../utils/passwordValidator');
    const requirements = getPasswordRequirements();

    res.json({
      requirements,
      description: 'Password must meet all of the following requirements'
    });
  } catch (error) {
    console.error('Get password requirements error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener los requisitos de contraseña'
    });
  }
});

/**
 * POST /api/auth/validate-password
 * Validate password strength and get detailed feedback
 * Public endpoint - no authentication required
 *
 * Body: { password: string }
 * Returns: { valid, score, strength, requirements[], message, feedback[] }
 */
router.post('/validate-password', validationLimiter, (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Falta la contraseña',
        message: 'Se requiere una contraseña para validar'
      });
    }

    const { validatePasswordStrength } = require('../utils/passwordValidator');
    const validation = validatePasswordStrength(password);

    res.json(validation);
  } catch (error) {
    console.error('Validate password error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al validar la contraseña'
    });
  }
});

/**
 * POST /api/auth/validate-username
 * Validate username format and check availability
 * Public endpoint - no authentication required
 *
 * Body: { username: string }
 * Returns: { valid, available, requirements[], message, feedback[] }
 */
router.post('/validate-username', validationLimiter, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        error: 'Falta el nombre de usuario',
        message: 'Se requiere un nombre de usuario para validar'
      });
    }

    const { validateUsernameFormat, checkUsernameAvailability } = require('../utils/usernameValidator');

    // First validate the format
    const formatValidation = validateUsernameFormat(username);

    // If format is not valid, return early
    if (!formatValidation.valid) {
      return res.json({
        ...formatValidation,
        available: null,
        availabilityMessage: 'Primero completa los requisitos de formato'
      });
    }

    // Format is valid, now check availability
    const existingUser = await User.findOne({ where: { username } });
    const available = !existingUser;

    res.json({
      ...formatValidation,
      available,
      availabilityMessage: available
        ? 'El nombre de usuario está disponible'
        : 'El nombre de usuario ya está en uso'
    });
  } catch (error) {
    console.error('Validate username error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al validar el nombre de usuario'
    });
  }
});

module.exports = router;
