/**
 * CsrfToken Model (Sequelize)
 * Represents the csrf_tokens table
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CsrfToken = sequelize.define('csrf_tokens', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  token: {
    type: DataTypes.STRING(128),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [64, 128]
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'created_at'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  tableName: 'csrf_tokens',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['token']
    },
    {
      fields: ['expires_at']
    }
  ]
});

/**
 * Instance methods
 */

// Check if CSRF token is expired
CsrfToken.prototype.isExpired = function() {
  return new Date() > new Date(this.expires_at);
};

// Check if CSRF token is valid (not expired and not used if single-use)
CsrfToken.prototype.isValid = function(singleUse = false) {
  if (this.isExpired()) return false;
  if (singleUse && this.used) return false;
  return true;
};

// Mark token as used
CsrfToken.prototype.markAsUsed = async function() {
  this.used = true;
  await this.save();
};

/**
 * Class methods
 */

// Find valid CSRF token
CsrfToken.findValidToken = async function(token, options = {}) {
  const where = {
    token,
    expires_at: {
      [sequelize.Sequelize.Op.gt]: new Date()
    }
  };

  // Optional: Check if token belongs to specific user
  if (options.userId) {
    where.user_id = options.userId;
  }

  // Optional: Check if token matches IP
  if (options.ipAddress) {
    where.ip_address = options.ipAddress;
  }

  // Optional: Check if not used (single-use mode)
  if (options.singleUse) {
    where.used = false;
  }

  return await CsrfToken.findOne({ where });
};

// Create new CSRF token
CsrfToken.createToken = async function(token, expiryHours = 2, options = {}) {
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  return await CsrfToken.create({
    token,
    user_id: options.userId || null,
    ip_address: options.ipAddress || null,
    expires_at: expiresAt
  });
};

// Clean up expired tokens
CsrfToken.cleanupExpired = async function() {
  const result = await CsrfToken.destroy({
    where: {
      expires_at: {
        [sequelize.Sequelize.Op.lt]: new Date()
      }
    }
  });
  return result; // Number of rows deleted
};

// Clean up used tokens (for single-use mode)
CsrfToken.cleanupUsed = async function(olderThanHours = 1) {
  const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

  const result = await CsrfToken.destroy({
    where: {
      used: true,
      created_at: {
        [sequelize.Sequelize.Op.lt]: cutoffDate
      }
    }
  });
  return result; // Number of rows deleted
};

// Get statistics
CsrfToken.getStats = async function() {
  const total = await CsrfToken.count();
  const used = await CsrfToken.count({ where: { used: true } });
  const expired = await CsrfToken.count({
    where: {
      expires_at: {
        [sequelize.Sequelize.Op.lt]: new Date()
      }
    }
  });
  const active = await CsrfToken.count({
    where: {
      expires_at: {
        [sequelize.Sequelize.Op.gt]: new Date()
      },
      used: false
    }
  });

  return {
    total_tokens: total,
    used_tokens: used,
    expired_tokens: expired,
    active_tokens: active
  };
};

module.exports = CsrfToken;
