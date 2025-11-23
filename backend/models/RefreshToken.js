/**
 * RefreshToken Model (Sequelize)
 * Represents the refresh_tokens table
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RefreshToken = sequelize.define('refresh_tokens', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'token_hash',  // Maps to token_hash column in DB
    validate: {
      notEmpty: true
    }
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'created_at'
  }
}, {
  tableName: 'refresh_tokens',
  timestamps: false
});

/**
 * Instance methods
 */

// Check if refresh token is expired
RefreshToken.prototype.isExpired = function() {
  return new Date() > new Date(this.expires_at);
};

// Check if refresh token is valid
RefreshToken.prototype.isValid = function() {
  return !this.isExpired();
};

/**
 * Class methods
 */

// Find valid refresh token by hash and user ID
RefreshToken.findValidToken = async function(tokenHash, userId) {
  return await RefreshToken.findOne({
    where: {
      token: tokenHash,
      user_id: userId,
      expires_at: {
        [sequelize.Sequelize.Op.gt]: new Date()
      }
    }
  });
};

// Revoke all refresh tokens for a user
RefreshToken.revokeAllForUser = async function(userId) {
  const result = await RefreshToken.destroy({
    where: { user_id: userId }
  });
  return result; // Number of rows deleted
};

// Revoke specific refresh token
RefreshToken.revokeToken = async function(tokenHash, userId) {
  const result = await RefreshToken.destroy({
    where: {
      token: tokenHash,
      user_id: userId
    }
  });
  return result > 0;
};

// Clean up expired tokens
RefreshToken.cleanupExpired = async function() {
  const result = await RefreshToken.destroy({
    where: {
      expires_at: {
        [sequelize.Sequelize.Op.lt]: new Date()
      }
    }
  });
  return result; // Number of rows deleted
};

// Get token count for user
RefreshToken.countForUser = async function(userId) {
  return await RefreshToken.count({
    where: { user_id: userId }
  });
};

module.exports = RefreshToken;
