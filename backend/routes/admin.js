/**
 * Admin Routes (Sequelize)
 * Admin-only endpoints for user management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { User } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

/**
 * POST /api/admin/users/:userId/unlock
 * Unlock a locked user account (admin only)
 */
router.post('/users/:userId/unlock', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'ID de usuario inválido',
      message: 'El ID de usuario debe ser un número'
    });
  }

  try {
    // Find user
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'locked_until', 'failed_attempts']
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró ningún usuario con este ID'
      });
    }

    const wasLockedUntil = user.locked_until;
    const failedAttemptsCount = user.failed_attempts;

    // Unlock the account using model method
    await user.unlock();

    // Log the unlock action
    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) unlocked account for user ${user.username} (ID: ${userId})`);

    res.json({
      message: 'Cuenta desbloqueada exitosamente',
      user: {
        id: user.id,
        username: user.username,
        was_locked_until: wasLockedUntil,
        failed_attempts_reset: failedAttemptsCount
      }
    });

  } catch (error) {
    console.error('Unlock account error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al desbloquear la cuenta'
    });
  }
});

/**
 * GET /api/admin/users/locked
 * Get list of all locked accounts (admin only)
 */
router.get('/users/locked', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  try {
    const lockedUsers = await User.getLockedAccounts();

    res.json({
      count: lockedUsers.length,
      users: lockedUsers
    });

  } catch (error) {
    console.error('Get locked users error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener usuarios bloqueados'
    });
  }
});

/**
 * GET /api/admin/users
 * Get list of all users with their security status (admin only)
 */
router.get('/users', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  try {
    const { Role } = require('../models');

    const allUsers = await User.findAll({
      attributes: [
        'id',
        'username',
        'email',
        'nombre',
        'apellido',
        'role_id',
        'is_active',
        'email_verified',
        'created_at',
        'last_login',
        'failed_attempts',
        'locked_until'
      ],
      include: [{
        model: Role,
        as: 'role',
        attributes: ['name']
      }],
      order: [['created_at', 'DESC']]
    });

    // Transform data to match frontend expectations
    const usersData = allUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      role: user.role ? user.role.name : 'unknown',
      role_id: user.role_id,
      active: user.is_active,
      email_verified: user.email_verified,
      created_at: user.created_at,
      last_login: user.last_login,
      failed_attempts: user.failed_attempts,
      locked_until: user.locked_until
    }));

    res.json(usersData);

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener los usuarios'
    });
  }
});

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
router.post('/users', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  try {
    const { username, email, nombre, apellido, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        message: 'Se requieren nombre de usuario y contraseña'
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        error: 'Nombre de usuario ya existe',
        message: 'Por favor elige un nombre de usuario diferente'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Get default user role (role_id = 2 for 'user')
    const { Role } = require('../models');
    const userRole = await Role.findOne({ where: { name: 'user' } });
    const role_id = userRole ? userRole.id : 2;

    // Create user
    const newUser = await User.create({
      username,
      email,
      nombre,
      apellido,
      password_hash,
      role_id,
      is_active: true
    });

    console.log(`Admin ${req.user.username} created new user: ${username} (ID: ${newUser.id})`);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        nombre: newUser.nombre,
        apellido: newUser.apellido
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear el usuario'
    });
  }
});

/**
 * PUT /api/admin/users/:userId
 * Update a user (admin only)
 */
router.put('/users/:userId', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'ID de usuario inválido',
      message: 'El ID de usuario debe ser un número'
    });
  }

  try {
    const { username, email, nombre, apellido, password } = req.body;

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró ningún usuario con este ID'
      });
    }

    // Protect the "admin" account username from being changed
    if (user.username === 'admin' && username && username !== 'admin') {
      return res.status(403).json({
        error: 'No se puede cambiar el nombre de usuario admin',
        message: 'El nombre de usuario de la cuenta "admin" está protegido y no puede ser cambiado'
      });
    }

    // Check if username is being changed and if it already exists
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({
          error: 'Nombre de usuario ya existe',
          message: 'Por favor elige un nombre de usuario diferente'
        });
      }
      user.username = username;
    }

    // Update fields
    if (email !== undefined) user.email = email;
    if (nombre !== undefined) user.nombre = nombre;
    if (apellido !== undefined) user.apellido = apellido;

    // Update password if provided
    let passwordChanged = false;
    if (password && password.trim() !== '') {
      user.password_hash = await bcrypt.hash(password, 10);
      // Mark that user must change password on next login
      user.must_change_password = true;
      passwordChanged = true;
    }

    await user.save();

    console.log(`Admin ${req.user.username} updated user ID ${userId}`);

    // Prepare response message
    let message = 'Usuario actualizado exitosamente';
    let warning = null;

    if (passwordChanged) {
      message = 'Usuario actualizado exitosamente. Contraseña temporal establecida.';
      warning = 'La contraseña que estableciste es temporal. El usuario deberá cambiarla en su próximo inicio de sesión.';
    }

    res.json({
      message,
      warning,
      passwordChanged,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        must_change_password: user.must_change_password
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar el usuario'
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete a user (admin only)
 */
router.delete('/users/:userId', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'ID de usuario inválido',
      message: 'El ID de usuario debe ser un número'
    });
  }

  try {
    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'No puedes eliminarte a ti mismo',
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró ningún usuario con este ID'
      });
    }

    // Protect the "admin" account from deletion
    if (user.username === 'admin') {
      return res.status(403).json({
        error: 'No se puede eliminar la cuenta admin',
        message: 'La cuenta "admin" está protegida y no puede ser eliminada'
      });
    }

    const username = user.username;
    await user.destroy();

    console.log(`Admin ${req.user.username} deleted user ${username} (ID: ${userId})`);

    res.json({
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar el usuario'
    });
  }
});

/**
 * PATCH /api/admin/users/:userId/reset-attempts
 * Reset failed login attempts without unlocking (admin only)
 */
router.patch('/users/:userId/reset-attempts', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'ID de usuario inválido',
      message: 'El ID de usuario debe ser un número'
    });
  }

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró ningún usuario con este ID'
      });
    }

    // Reset failed attempts but keep lock if active
    user.failed_attempts = 0;
    user.last_failed_attempt = null;
    await user.save();

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) reset failed attempts for user ID ${userId}`);

    res.json({
      message: 'Intentos fallidos restablecidos exitosamente'
    });

  } catch (error) {
    console.error('Reset attempts error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al restablecer los intentos'
    });
  }
});

/**
 * POST /api/admin/users/:userId/reset-password
 * Set a temporary password for a user (admin only)
 * The user will be required to change it on next login
 */
router.post('/users/:userId/reset-password', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { temporaryPassword } = req.body;

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'ID de usuario inválido',
      message: 'El ID de usuario debe ser un número'
    });
  }

  if (!temporaryPassword || temporaryPassword.trim() === '') {
    return res.status(400).json({
      error: 'Contraseña temporal requerida',
      message: 'Debes proporcionar una contraseña temporal'
    });
  }

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró ningún usuario con este ID'
      });
    }

    // Hash the temporary password
    user.password_hash = await bcrypt.hash(temporaryPassword, 10);
    user.must_change_password = true;
    await user.save();

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) set temporary password for user ${user.username} (ID: ${userId})`);

    res.json({
      message: 'Contraseña temporal establecida exitosamente',
      warning: 'El usuario deberá cambiar su contraseña en el próximo inicio de sesión',
      temporaryPassword: temporaryPassword
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al establecer la contraseña temporal'
    });
  }
});

/**
 * POST /api/admin/users/:userId/verify-email
 * Manually verify a user's email (admin only)
 */
router.post('/users/:userId/verify-email', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'ID de usuario inválido',
      message: 'El ID de usuario debe ser un número'
    });
  }

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró ningún usuario con este ID'
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        error: 'Email ya verificado',
        message: 'Este usuario ya tiene su email verificado'
      });
    }

    // Verify the email manually
    user.email_verified = true;
    user.email_verification_token = null;
    user.email_verification_expires = null;
    await user.save();

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) manually verified email for user ${user.username} (ID: ${userId})`);

    res.json({
      message: 'Email verificado exitosamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: true
      }
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al verificar el email'
    });
  }
});

/**
 * POST /api/admin/users/:userId/resend-verification
 * Resend verification email for a user (admin only)
 */
router.post('/users/:userId/resend-verification', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'ID de usuario inválido',
      message: 'El ID de usuario debe ser un número'
    });
  }

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró ningún usuario con este ID'
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        error: 'Email ya verificado',
        message: 'Este usuario ya tiene su email verificado'
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
    await sendVerificationEmail(user.email, verificationToken, user.username);

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) resent verification email for user ${user.username} (ID: ${userId})`);

    res.json({
      message: 'Email de verificación reenviado exitosamente',
      email: user.email
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al reenviar el email de verificación'
    });
  }
});

/**
 * POST /api/admin/users/:userId/change-email
 * Change a user's email address (admin only)
 * This will unverify the email and send a new verification email
 */
router.post('/users/:userId/change-email', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { newEmail } = req.body;

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'ID de usuario inválido',
      message: 'El ID de usuario debe ser un número'
    });
  }

  if (!newEmail || !newEmail.includes('@')) {
    return res.status(400).json({
      error: 'Email inválido',
      message: 'Debes proporcionar una dirección de email válida'
    });
  }

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró ningún usuario con este ID'
      });
    }

    // Check if email already exists for another user
    const existingUser = await User.findOne({
      where: {
        email: newEmail,
        id: { [Op.ne]: userId }
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Email ya existe',
        message: 'Este email ya está registrado por otro usuario'
      });
    }

    const oldEmail = user.email;

    // Update email and unverify
    user.email = newEmail;
    user.email_verified = false;

    // Generate new verification token
    const { generateVerificationToken, sendVerificationEmail } = require('../services/emailService');
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    user.email_verification_token = verificationToken;
    user.email_verification_expires = verificationExpires;
    await user.save();

    // Send verification email to new address
    await sendVerificationEmail(newEmail, verificationToken, user.username);

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) changed email for user ${user.username} (ID: ${userId}) from ${oldEmail} to ${newEmail}`);

    res.json({
      message: 'Email cambiado exitosamente',
      warning: 'Se ha enviado un email de verificación a la nueva dirección',
      user: {
        id: user.id,
        username: user.username,
        oldEmail: oldEmail,
        newEmail: newEmail,
        email_verified: false
      }
    });

  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al cambiar el email'
    });
  }
});

/**
 * PATCH /api/admin/users/:userId/toggle-active
 * Toggle user account active status (admin only)
 */
router.patch('/users/:userId/toggle-active', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'ID de usuario inválido',
      message: 'El ID de usuario debe ser un número'
    });
  }

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró ningún usuario con este ID'
      });
    }

    // Protect admin account
    if (user.username === 'admin') {
      return res.status(403).json({
        error: 'No se puede desactivar la cuenta admin',
        message: 'La cuenta "admin" está protegida y no puede ser desactivada'
      });
    }

    // Prevent admin from deactivating themselves
    if (user.id === req.user.id) {
      return res.status(403).json({
        error: 'No puedes desactivar tu propia cuenta',
        message: 'No puedes desactivar tu propia cuenta'
      });
    }

    // Toggle active status
    const newStatus = !user.is_active;
    user.is_active = newStatus;
    await user.save();

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) ${newStatus ? 'activated' : 'deactivated'} user ${user.username} (ID: ${userId})`);

    res.json({
      message: `Cuenta ${newStatus ? 'activada' : 'desactivada'} exitosamente`,
      user: {
        id: user.id,
        username: user.username,
        is_active: newStatus
      }
    });

  } catch (error) {
    console.error('Toggle active status error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al cambiar el estado de la cuenta'
    });
  }
});

/**
 * POST /api/admin/users/:userId/approve
 * Approve/activate a user account (admin only)
 * Changes user role from 'new_user' to 'library_employee'
 */
router.post('/users/:userId/approve', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'ID de usuario inválido',
      message: 'El ID de usuario debe ser un número'
    });
  }

  try {
    const { Role } = require('../models');
    const user = await User.findByPk(userId, {
      include: [{
        model: Role,
        as: 'role'
      }]
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró ningún usuario con este ID'
      });
    }

    // Check if user is already approved (not new_user)
    if (user.role && user.role.name !== 'new_user') {
      return res.status(400).json({
        error: 'Usuario ya está aprobado',
        message: 'Este usuario ya tiene su cuenta aprobada'
      });
    }

    // Find library_employee role
    const libraryEmployeeRole = await Role.findOne({ where: { name: 'library_employee' } });

    if (!libraryEmployeeRole) {
      return res.status(500).json({
        error: 'Error de configuración',
        message: 'No se encontró el rol library_employee'
      });
    }

    // Approve the account: change role and ensure is_active
    user.role_id = libraryEmployeeRole.id;
    user.is_active = true;
    await user.save();

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) approved account for user ${user.username} (ID: ${userId}) - changed role from new_user to library_employee`);

    res.json({
      message: 'Cuenta aprobada exitosamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: libraryEmployeeRole.name,
        is_active: true
      }
    });

  } catch (error) {
    console.error('Approve account error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al aprobar la cuenta'
    });
  }
});

module.exports = router;
