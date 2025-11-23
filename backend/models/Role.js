/**
 * Role Model (Sequelize)
 * Represents the roles table
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
      len: [2, 50],
      isValidName(value) {
        // Only allow alphanumeric, underscore, and hyphen
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
          throw new Error('El nombre del rol debe comenzar con letra y contener solo letras, números, guiones y guiones bajos');
        }
      }
    }
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
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

// Check if role has permission for a resource/action (async - uses 3NF structure)
Role.prototype.hasPermission = async function(resource, action) {
  const RolePermission = require('./RolePermission');
  const Resource = require('./Resource');

  // Map socios, tirada, and cobrocuotas to the unified "library_associateds" resource
  const libraryAssociateResources = ['socios', 'tirada', 'cobrocuotas'];
  const mappedResource = libraryAssociateResources.includes(resource) ? 'library_associateds' : resource;

  // Check for wildcard resource permission (admin)
  const wildcardResource = await Resource.findOne({ where: { name: '*' } });
  if (wildcardResource) {
    const wildcardPerm = await RolePermission.findOne({
      where: {
        role_id: this.id,
        resource_id: wildcardResource.id
      }
    });

    if (wildcardPerm && Array.isArray(wildcardPerm.actions) && wildcardPerm.actions.includes('*')) {
      return true;  // Admin has all permissions
    }
  }

  // Find the specific resource
  const resourceRecord = await Resource.findOne({ where: { name: mappedResource } });
  if (!resourceRecord) {
    return false;
  }

  // Find permission for this role-resource combination
  const permission = await RolePermission.findOne({
    where: {
      role_id: this.id,
      resource_id: resourceRecord.id
    }
  });

  if (!permission || !Array.isArray(permission.actions)) {
    return false;
  }

  return permission.actions.includes(action) || permission.actions.includes('*');
};

// Get all permissions for a specific resource (async - uses 3NF structure)
Role.prototype.getResourcePermissions = async function(resource) {
  const RolePermission = require('./RolePermission');
  const Resource = require('./Resource');

  // Map socios, tirada, and cobrocuotas to the unified "library_associateds" resource
  const libraryAssociateResources = ['socios', 'tirada', 'cobrocuotas'];
  const mappedResource = libraryAssociateResources.includes(resource) ? 'library_associateds' : resource;

  // Find the specific resource
  const resourceRecord = await Resource.findOne({ where: { name: mappedResource } });
  if (!resourceRecord) {
    return [];
  }

  // Find permission for this role-resource combination
  const permission = await RolePermission.findOne({
    where: {
      role_id: this.id,
      resource_id: resourceRecord.id
    }
  });

  return permission && Array.isArray(permission.actions) ? permission.actions : [];
};

// Check if role can perform any action on a resource (async - uses 3NF structure)
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

// Check if role name is valid (checks database)
Role.isValidRole = async function(name) {
  const role = await Role.findByName(name);
  return role !== null;
};

// Get all system (non-deletable) roles
Role.getSystemRoles = function() {
  return ['root', 'new_user'];
};

// Check if a role is a system role (cannot be deleted)
Role.isSystemRole = function(name) {
  return Role.getSystemRoles().includes(name);
};

module.exports = Role;
