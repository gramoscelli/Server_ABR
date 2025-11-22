/**
 * ApiKey Model (Sequelize)
 * Represents the api_keys table
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApiKey = sequelize.define('api_keys', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'api_key',  // Map to api_key column in database
    validate: {
      notEmpty: true
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  active: {
    type: DataTypes.BOOLEAN,
    field: 'is_active',  // Map to is_active column in database
    defaultValue: true,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'created_at'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_used: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'api_keys',
  timestamps: false
});

/**
 * Instance methods
 */

// Check if API key is expired
ApiKey.prototype.isExpired = function() {
  if (!this.expires_at) return false;
  return new Date() > new Date(this.expires_at);
};

// Check if API key is valid (active and not expired)
ApiKey.prototype.isValid = function() {
  return this.active && !this.isExpired();
};

// Update last used timestamp
ApiKey.prototype.updateLastUsed = async function() {
  this.last_used = new Date();
  await this.save();
};

// Deactivate API key
ApiKey.prototype.deactivate = async function() {
  this.active = false;
  await this.save();
};

/**
 * Class methods
 */

// Find active API keys for a user
ApiKey.findActiveByUserId = async function(userId) {
  return await ApiKey.findAll({
    where: {
      user_id: userId,
      active: true
    },
    order: [['created_at', 'DESC']]
  });
};

// Find API key by hash
ApiKey.findByHash = async function(keyHash) {
  return await ApiKey.findOne({
    where: { key_hash: keyHash }
  });
};

// Clean up expired API keys
ApiKey.cleanupExpired = async function() {
  const result = await ApiKey.update(
    { active: false },
    {
      where: {
        expires_at: {
          [sequelize.Sequelize.Op.lt]: new Date()
        },
        active: true
      }
    }
  );
  return result[0]; // Number of rows updated
};

module.exports = ApiKey;
