/**
 * Role Management Routes (Sequelize)
 * Admin-only endpoints for managing roles and role assignments
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { User, Role, Resource, RolePermission } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

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

/**
 * POST /api/roles
 * Create a new role (root only)
 */
router.post('/', authenticateToken, authorizeRoles('root'), async (req, res) => {
  const { name, description } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({
      error: 'Nombre requerido',
      message: 'El nombre del rol debe tener al menos 2 caracteres'
    });
  }

  const trimmedName = name.trim().toLowerCase().replace(/\s+/g, '_');

  try {
    // Check if role already exists
    const existingRole = await Role.findByName(trimmedName);
    if (existingRole) {
      return res.status(409).json({
        error: 'Rol ya existe',
        message: `Ya existe un rol con el nombre "${trimmedName}"`
      });
    }

    const newRole = await Role.create({
      name: trimmedName,
      description: description?.trim() || null,
      is_system: false
    });

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) created new role: ${trimmedName}`);

    res.status(201).json({
      message: 'Rol creado exitosamente',
      role: {
        id: newRole.id,
        name: newRole.name,
        description: newRole.description,
        is_system: newRole.is_system
      }
    });

  } catch (error) {
    console.error('Create role error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validación fallida',
        message: error.errors?.[0]?.message || 'Error de validación del nombre del rol'
      });
    }
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear el rol'
    });
  }
});

/**
 * PUT /api/roles/:roleId
 * Update a role (root only)
 */
router.put('/:roleId', authenticateToken, authorizeRoles('root'), async (req, res) => {
  const roleId = parseInt(req.params.roleId);
  const { name, description } = req.body;

  if (isNaN(roleId)) {
    return res.status(400).json({
      error: 'ID de rol inválido',
      message: 'El ID de rol debe ser un número válido'
    });
  }

  try {
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({
        error: 'Rol no encontrado',
        message: `El rol con ID ${roleId} no existe`
      });
    }

    // Prevent modifying system roles' names
    if (Role.isSystemRole(role.name) && name && name !== role.name) {
      return res.status(403).json({
        error: 'Rol del sistema',
        message: 'No se puede cambiar el nombre de los roles del sistema (root, new_user)'
      });
    }

    const updates = {};
    if (name && name !== role.name) {
      const trimmedName = name.trim().toLowerCase().replace(/\s+/g, '_');
      // Check if new name already exists
      const existingRole = await Role.findByName(trimmedName);
      if (existingRole && existingRole.id !== roleId) {
        return res.status(409).json({
          error: 'Nombre duplicado',
          message: `Ya existe un rol con el nombre "${trimmedName}"`
        });
      }
      updates.name = trimmedName;
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'Sin cambios',
        message: 'No se especificaron cambios para actualizar'
      });
    }

    updates.updated_at = new Date();
    await role.update(updates);

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) updated role ${roleId}: ${JSON.stringify(updates)}`);

    res.json({
      message: 'Rol actualizado exitosamente',
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        is_system: role.is_system
      }
    });

  } catch (error) {
    console.error('Update role error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validación fallida',
        message: error.errors?.[0]?.message || 'Error de validación'
      });
    }
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo actualizar el rol'
    });
  }
});

/**
 * DELETE /api/roles/:roleId
 * Delete a role (root only)
 */
router.delete('/:roleId', authenticateToken, authorizeRoles('root'), async (req, res) => {
  const roleId = parseInt(req.params.roleId);

  if (isNaN(roleId)) {
    return res.status(400).json({
      error: 'ID de rol inválido',
      message: 'El ID de rol debe ser un número válido'
    });
  }

  try {
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({
        error: 'Rol no encontrado',
        message: `El rol con ID ${roleId} no existe`
      });
    }

    // Prevent deleting system roles
    if (Role.isSystemRole(role.name) || role.is_system) {
      return res.status(403).json({
        error: 'Rol del sistema',
        message: 'No se pueden eliminar los roles del sistema'
      });
    }

    // Check if any users have this role
    const usersWithRole = await User.count({ where: { role_id: roleId } });
    if (usersWithRole > 0) {
      return res.status(409).json({
        error: 'Rol en uso',
        message: `No se puede eliminar el rol porque ${usersWithRole} usuario(s) lo tienen asignado. Reasigna los usuarios primero.`
      });
    }

    // Delete associated permissions first
    await RolePermission.destroy({ where: { role_id: roleId } });

    // Delete the role
    const roleName = role.name;
    await role.destroy();

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) deleted role: ${roleName} (ID: ${roleId})`);

    res.json({
      message: 'Rol eliminado exitosamente',
      deleted_role: roleName
    });

  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo eliminar el rol'
    });
  }
});

/**
 * GET /api/roles/:roleId/permissions
 * Get permissions for a specific role (admin/root only)
 */
router.get('/:roleId/permissions', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  const roleId = parseInt(req.params.roleId);

  if (isNaN(roleId)) {
    return res.status(400).json({
      error: 'ID de rol inválido',
      message: 'El ID de rol debe ser un número válido'
    });
  }

  try {
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({
        error: 'Rol no encontrado',
        message: `El rol con ID ${roleId} no existe`
      });
    }

    // Get all resources
    const resources = await Resource.findAll({
      order: [['name', 'ASC']]
    });

    // Get permissions for this role
    const permissions = await RolePermission.findAll({
      where: { role_id: roleId },
      include: [{
        model: Resource,
        as: 'resource',
        attributes: ['id', 'name', 'description']
      }]
    });

    // Create a map of resource permissions
    const permissionMap = {};
    permissions.forEach(perm => {
      if (perm.resource) {
        permissionMap[perm.resource.name] = {
          resource_id: perm.resource.id,
          actions: perm.actions || []
        };
      }
    });

    // Build complete permission matrix
    const permissionMatrix = resources.map(resource => ({
      resource_id: resource.id,
      resource_name: resource.name,
      resource_description: resource.description,
      actions: permissionMap[resource.name]?.actions || [],
      available_actions: ['read', 'create', 'update', 'delete', 'print', '*']
    }));

    res.json({
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        is_system: role.is_system
      },
      permissions: permissionMatrix
    });

  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los permisos del rol'
    });
  }
});

/**
 * PUT /api/roles/:roleId/permissions
 * Update permissions for a role (root only)
 */
router.put('/:roleId/permissions', authenticateToken, authorizeRoles('root'), async (req, res) => {
  const roleId = parseInt(req.params.roleId);
  const { permissions } = req.body;

  if (isNaN(roleId)) {
    return res.status(400).json({
      error: 'ID de rol inválido',
      message: 'El ID de rol debe ser un número válido'
    });
  }

  if (!Array.isArray(permissions)) {
    return res.status(400).json({
      error: 'Formato inválido',
      message: 'Se espera un array de permisos'
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const role = await Role.findByPk(roleId);
    if (!role) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Rol no encontrado',
        message: `El rol con ID ${roleId} no existe`
      });
    }

    // Prevent modifying root role's wildcard permission
    if (role.name === 'root') {
      await transaction.rollback();
      return res.status(403).json({
        error: 'Rol protegido',
        message: 'No se pueden modificar los permisos del rol root'
      });
    }

    const validActions = ['read', 'create', 'update', 'delete', 'print', '*'];
    const updatedPermissions = [];

    for (const perm of permissions) {
      const { resource_id, actions } = perm;

      if (!resource_id || !Array.isArray(actions)) {
        continue;
      }

      // Validate resource exists
      const resource = await Resource.findByPk(resource_id);
      if (!resource) {
        continue;
      }

      // Filter valid actions
      const filteredActions = actions.filter(a => validActions.includes(a));

      if (filteredActions.length === 0) {
        // Remove permission if no actions
        await RolePermission.destroy({
          where: { role_id: roleId, resource_id },
          transaction
        });
      } else {
        // Upsert permission
        const [rolePermission] = await RolePermission.upsert({
          role_id: roleId,
          resource_id,
          actions: filteredActions,
          updated_at: new Date()
        }, { transaction });

        updatedPermissions.push({
          resource: resource.name,
          actions: filteredActions
        });
      }
    }

    await transaction.commit();

    console.log(`Admin ${req.user.username} (ID: ${req.user.id}) updated permissions for role ${role.name} (ID: ${roleId})`);

    res.json({
      message: 'Permisos actualizados exitosamente',
      role: {
        id: role.id,
        name: role.name
      },
      updated_permissions: updatedPermissions
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Update role permissions error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron actualizar los permisos'
    });
  }
});

/**
 * GET /api/roles/resources
 * Get all available resources for permission assignment (admin/root only)
 */
router.get('/resources/all', authenticateToken, authorizeRoles('admin', 'root'), async (req, res) => {
  try {
    const resources = await Resource.findAll({
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']]
    });

    res.json({
      resources: resources.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        available_actions: r.name === '*'
          ? ['*']
          : ['read', 'create', 'update', 'delete', 'print']
      }))
    });

  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los recursos'
    });
  }
});

module.exports = router;
