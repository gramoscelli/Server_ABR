/**
 * RolePermission Model (Sequelize)
 * Junction table linking roles to resources with specific actions (3NF normalized)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RolePermission = sequelize.define('role_permissions', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'role_id',
    references: {
      model: 'roles',
      key: 'id'
    }
  },
  resource_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'resource_id',
    references: {
      model: 'resources',
      key: 'id'
    }
  },
  actions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of allowed actions: ["read", "create", "update", "delete", "print", "*"]'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'updated_at'
  }
}, {
  tableName: 'role_permissions',
  timestamps: false,  // We handle timestamps manually
  indexes: [
    {
      unique: true,
      fields: ['role_id', 'resource_id'],
      name: 'unique_role_resource'
    },
    {
      fields: ['role_id'],
      name: 'idx_role_id'
    },
    {
      fields: ['resource_id'],
      name: 'idx_resource_id'
    }
  ]
});

/**
 * Instance methods
 */

// Check if this permission allows a specific action
RolePermission.prototype.hasAction = function(action) {
  if (!Array.isArray(this.actions)) {
    return false;
  }

  // Check for wildcard action
  if (this.actions.includes('*')) {
    return true;
  }

  return this.actions.includes(action);
};

/**
 * Class methods
 */

// Get all permissions for a role
RolePermission.findByRoleId = async function(roleId) {
  return await RolePermission.findAll({
    where: { role_id: roleId },
    include: [{
      association: 'resource',
      attributes: ['name', 'description']
    }]
  });
};

// Get permission for a specific role-resource combination
RolePermission.findByRoleAndResource = async function(roleId, resourceId) {
  return await RolePermission.findOne({
    where: {
      role_id: roleId,
      resource_id: resourceId
    }
  });
};

// Grant permission (create or update)
RolePermission.grantPermission = async function(roleId, resourceId, actions) {
  const [permission, created] = await RolePermission.upsert({
    role_id: roleId,
    resource_id: resourceId,
    actions: Array.isArray(actions) ? actions : [actions]
  });

  return permission;
};

// Revoke permission (delete)
RolePermission.revokePermission = async function(roleId, resourceId) {
  const deleted = await RolePermission.destroy({
    where: {
      role_id: roleId,
      resource_id: resourceId
    }
  });

  return deleted > 0;
};

module.exports = RolePermission;
