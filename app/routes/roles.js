/**
 * Role Management Routes (Sequelize)
 * Admin-only endpoints for managing roles and role assignments
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { User, Role } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/roles
 * Get list of all roles with descriptions (admin/root only)
 */
router.get('/', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ['id', 'name', 'description', 'is_system'],
      order: [['id', 'ASC']]
    });

    res.json({
      roles: roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        is_system: role.is_system
      }))
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los roles'
    });
  }
});

/**
 * GET /api/roles/stats
 * Get statistics about role distribution (admin only)
 */
router.get('/stats', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ['id', 'name', 'description'],
      order: [['id', 'ASC']]
    });

    const totalUsers = await User.count();

    const roleStats = await Promise.all(
      roles.map(async (role) => {
        const count = await User.count({ where: { role_id: role.id } });
        return {
          id: role.id,
          name: role.name,
          description: role.description,
          count: count,
          percentage: totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(2) : 0
        };
      })
    );

    res.json({
      total_users: totalUsers,
      roles: roleStats
    });

  } catch (error) {
    console.error('Role stats error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las estadísticas de roles'
    });
  }
});

/**
 * PUT /api/roles/user/:userId
 * Update a user's role (admin only)
 */
router.put('/user/:userId', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { role_id } = req.body;

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'ID de usuario inválido',
      message: 'El ID de usuario debe ser un número válido'
    });
  }

  if (!role_id) {
    return res.status(400).json({
      error: 'Rol requerido',
      message: 'Debes especificar un ID de rol'
    });
  }

  try {
    // Verify role exists
    const role = await Role.findByPk(role_id);
    if (!role) {
      return res.status(400).json({
        error: 'Rol inválido',
        message: 'El rol especificado no existe'
      });
    }

    // Find user with current role
    const user = await User.findByPk(userId, {
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name']
      }]
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: `El usuario con ID ${userId} no existe`
      });
    }

    // Prevent modifying own role (safety measure)
    if (user.id === req.user.id) {
      return res.status(403).json({
        error: 'No se puede modificar el rol propio',
        message: 'No puedes cambiar tu propio rol. Solicita a otro administrador que lo haga.'
      });
    }

    // Check if this would remove the last admin/root
    const currentRole = user.role;
    if (currentRole && (currentRole.name === 'root' || currentRole.name === 'admin_employee')) {
      if (role.name !== 'root' && role.name !== 'admin_employee') {
        const adminCount = await User.count({
          include: [{
            model: Role,
            as: 'role',
            where: {
              name: { [Op.in]: ['root', 'admin_employee'] }
            }
          }]
        });

        if (adminCount === 1) {
          return res.status(403).json({
            error: 'No se puede eliminar el último administrador',
            message: 'No se puede degradar al último administrador. Promueve a otro usuario primero.'
          });
        }
      }
    }

    const oldRole = currentRole ? currentRole.name : 'unknown';
    user.role_id = role_id;
    await user.save();

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) changed role for user ${user.username} (ID: ${userId}) from ${oldRole} to ${role.name}`);

    res.json({
      message: 'Rol de usuario actualizado exitosamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        old_role: oldRole,
        new_role: role.name
      }
    });

  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo actualizar el rol del usuario'
    });
  }
});

/**
 * GET /api/roles/:roleId/users
 * Get all users with a specific role (admin only)
 */
router.get('/:roleId/users', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const roleId = parseInt(req.params.roleId);

  if (isNaN(roleId)) {
    return res.status(400).json({
      error: 'ID de rol inválido',
      message: 'El ID de rol debe ser un número'
    });
  }

  try {
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({
        error: 'Rol no encontrado',
        message: 'El rol especificado no existe'
      });
    }

    const users = await User.findAll({
      where: { role_id: roleId },
      attributes: ['id', 'username', 'email', 'is_active', 'last_login', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    res.json({
      role: {
        id: role.id,
        name: role.name,
        description: role.description
      },
      count: users.length,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        is_active: user.is_active,
        last_login: user.last_login,
        created_at: user.created_at
      }))
    });

  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los usuarios'
    });
  }
});

module.exports = router;
