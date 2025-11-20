/**
 * User Model (Sequelize)
 * Represents the usuarios table
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Role = require('./Role');

const User = sequelize.define('usuarios', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 50]
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,  // Allow null for OAuth users
    validate: {
      // Custom validator: require password_hash unless oauth_only is true
      isValidPassword(value) {
        if (!value && !this.oauth_only) {
          throw new Error('Password is required for non-OAuth users');
        }
      }
    }
  },
  must_change_password: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'must_change_password',
    comment: 'User must change password on next login'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'roles',
      key: 'id'
    },
    field: 'role_id'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    field: 'is_active'  // Explicit column mapping
  },
  failed_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  oauth_only: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'oauth_only',
    comment: 'True if user only uses OAuth (no password)'
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'email_verified',
    comment: 'Email verification status'
  },
  email_verification_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'email_verification_token',
    comment: 'Token for email verification'
  },
  email_verification_expires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'email_verification_expires',
    comment: 'Expiration date for email verification token'
  },
  avatar_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'avatar_url',
    comment: 'User avatar URL from OAuth provider'
  },
  whatsapp: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'whatsapp',
    comment: 'WhatsApp phone number with country code',
    validate: {
      is: /^\+?[1-9]\d{1,14}$/i  // E.164 format validation
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'created_at'
  }
}, {
  tableName: 'usuarios',
  timestamps: false,  // We handle created_at manually
  indexes: [
    {
      unique: true,
      fields: ['username']
    },
    {
      fields: ['locked_until']
    }
  ]
});

/**
 * Instance methods
 */

// Get role name for this user
User.prototype.getRoleName = async function() {
  if (this.role) {
    return this.role.name;
  }
  const role = await Role.findByPk(this.role_id);
  return role ? role.name : null;
};

// Check if user has a specific role
User.prototype.hasRole = async function(roleName) {
  const userRole = await this.getRoleName();
  return userRole === roleName;
};

// Check if user has permission for a resource/action
User.prototype.hasPermission = async function(resource, action) {
  let role = this.role;
  if (!role) {
    role = await Role.findByPk(this.role_id);
  }
  return role ? role.hasPermission(resource, action) : false;
};

// Get all permissions for a specific resource
User.prototype.getResourcePermissions = async function(resource) {
  let role = this.role;
  if (!role) {
    role = await Role.findByPk(this.role_id);
  }
  return role ? role.getResourcePermissions(resource) : [];
};

// Check if account is locked
User.prototype.isLocked = function() {
  if (!this.locked_until) return false;
  return new Date() < new Date(this.locked_until);
};

// Get remaining lock time in minutes
User.prototype.getLockTimeRemaining = function() {
  if (!this.locked_until) return 0;
  const now = new Date();
  const lockedUntil = new Date(this.locked_until);
  if (now >= lockedUntil) return 0;
  return Math.ceil((lockedUntil - now) / 60000);
};

// Increment failed login attempts
User.prototype.incrementFailedAttempts = async function(maxAttempts = 5, lockoutMinutes = 30) {
  this.failed_attempts = (this.failed_attempts || 0) + 1;
  this.last_failed_attempt = new Date();

  if (this.failed_attempts >= maxAttempts) {
    this.locked_until = new Date(Date.now() + lockoutMinutes * 60000);
  }

  await this.save();
  return this.failed_attempts;
};

// Reset failed attempts on successful login
User.prototype.resetFailedAttempts = async function() {
  this.failed_attempts = 0;
  this.locked_until = null;
  this.last_failed_attempt = null;
  this.last_login = new Date();
  await this.save();
};

// Unlock account manually (admin action)
User.prototype.unlock = async function() {
  this.failed_attempts = 0;
  this.locked_until = null;
  this.last_failed_attempt = null;
  await this.save();
};

/**
 * Class methods
 */

// Find user by username
User.findByUsername = async function(username) {
  return await User.findOne({ where: { username } });
};

// Get all locked accounts
User.getLockedAccounts = async function() {
  return await User.findAll({
    where: {
      locked_until: {
        [sequelize.Sequelize.Op.gt]: new Date()
      }
    },
    attributes: ['id', 'username', 'email', 'failed_attempts', 'locked_until', 'last_failed_attempt']
  });
};

module.exports = User;
