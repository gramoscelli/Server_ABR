/**
 * Role Model (Sequelize) - 3NF Normalized Version
 * Represents the roles table with normalized permissions via role_permissions junction table
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('roles', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      isIn: [['admin', 'library_employee', 'readonly', 'printer', 'new_user', 'admin_employee']]
    }
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: 'DEPRECATED: Use role_permissions table instead. Kept for backward compatibility.'
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'is_system',
    comment: 'System role cannot be modified or deleted'
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
  tableName: 'roles',
  timestamps: false,  // We handle timestamps manually
  indexes: [
    {
      unique: true,
      fields: ['name']
    }
  ]
});

/**
 * Instance methods - Using 3NF normalized structure
 */

// Check if role has permission for a resource/action (3NF version)
Role.prototype.hasPermission = async function(resource, action) {
  // Load permissions if not already loaded
  if (!this.rolePermissions) {
    const RolePermission = require('./RolePermission');
    const Resource = require('./Resource');

    this.rolePermissions = await RolePermission.findAll({
      where: { role_id: this.id },
      include: [{
        model: Resource,
        as: 'resource'
      }]
    });
  }

  // Check for wildcard resource permission (admin)
  const wildcardPerm = this.rolePermissions.find(p =>
    p.resource && p.resource.name === '*'
  );

  if (wildcardPerm && wildcardPerm.hasAction('*')) {
    return true;  // Admin has all permissions
  }

  // Map socios, tirada, and cobrocuotas to the unified "library_associateds" resource
  const libraryAssociateResources = ['socios', 'tirada', 'cobrocuotas'];
  const mappedResource = libraryAssociateResources.includes(resource) ? 'library_associateds' : resource;

  // Find permission for the specific resource
  const resourcePerm = this.rolePermissions.find(p =>
    p.resource && p.resource.name === mappedResource
  );

  if (!resourcePerm) {
    return false;
  }

  return resourcePerm.hasAction(action);
};

// Get all permissions for a specific resource (3NF version)
Role.prototype.getResourcePermissions = async function(resource) {
  // Load permissions if not already loaded
  if (!this.rolePermissions) {
    const RolePermission = require('./RolePermission');
    const Resource = require('./Resource');

    this.rolePermissions = await RolePermission.findAll({
      where: { role_id: this.id },
      include: [{
        model: Resource,
        as: 'resource'
      }]
    });
  }

  // Map socios, tirada, and cobrocuotas to the unified "library_associateds" resource
  const libraryAssociateResources = ['socios', 'tirada', 'cobrocuotas'];
  const mappedResource = libraryAssociateResources.includes(resource) ? 'library_associateds' : resource;

  // Find permission for the specific resource
  const resourcePerm = this.rolePermissions.find(p =>
    p.resource && p.resource.name === mappedResource
  );

  return resourcePerm ? resourcePerm.actions : [];
};

// Check if role can perform any action on a resource (3NF version)
Role.prototype.canAccessResource = async function(resource) {
  const permissions = await this.getResourcePermissions(resource);
  return permissions.length > 0;
};

/**
 * Class methods
 */

// Find role by name
Role.findByName = async function(name) {
  return await Role.findOne({ where: { name } });
};

// Get role ID by name (useful for user creation)
Role.getIdByName = async function(name) {
  const role = await Role.findByName(name);
  return role ? role.id : null;
};

// Check if role name is valid
Role.isValidRole = function(name) {
  return ['admin', 'library_employee', 'readonly', 'printer', 'new_user', 'admin_employee'].includes(name);
};

module.exports = Role;
