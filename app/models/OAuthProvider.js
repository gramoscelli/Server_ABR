/**
 * OAuthProvider Model (Sequelize)
 * Represents OAuth provider connections for users
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OAuthProvider = sequelize.define('oauth_providers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  provider: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['google', 'github', 'facebook', 'microsoft']]
    },
    comment: 'OAuth provider name (google, github, etc.)'
  },
  provider_user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'provider_user_id',
    comment: 'User ID from OAuth provider'
  },
  provider_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'provider_email',
    comment: 'Email from OAuth provider'
  },
  provider_username: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'provider_username',
    comment: 'Username from OAuth provider'
  },
  access_token: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'access_token',
    comment: 'OAuth access token (should be encrypted in production)'
  },
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refresh_token',
    comment: 'OAuth refresh token (should be encrypted in production)'
  },
  token_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'token_expires_at',
    comment: 'When the access token expires'
  },
  profile_data: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'profile_data',
    comment: 'Additional profile data from provider'
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
  tableName: 'oauth_providers',
  timestamps: false,  // We handle timestamps manually
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['provider']
    },
    {
      fields: ['provider_user_id']
    },
    {
      unique: true,
      fields: ['provider', 'provider_user_id']
    }
  ]
});

/**
 * Class methods
 */

// Find OAuth provider by provider name and provider user ID
OAuthProvider.findByProvider = async function(provider, providerUserId) {
  return await OAuthProvider.findOne({
    where: {
      provider,
      provider_user_id: providerUserId
    }
  });
};

// Find all OAuth providers for a user
OAuthProvider.findByUserId = async function(userId) {
  return await OAuthProvider.findAll({
    where: { user_id: userId }
  });
};

// Create or update OAuth provider
OAuthProvider.upsertProvider = async function(data) {
  const existing = await OAuthProvider.findByProvider(data.provider, data.provider_user_id);

  if (existing) {
    // Update existing provider
    await existing.update({
      provider_email: data.provider_email,
      provider_username: data.provider_username,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: data.token_expires_at,
      profile_data: data.profile_data,
      updated_at: new Date()
    });
    return existing;
  } else {
    // Create new provider
    return await OAuthProvider.create(data);
  }
};

// Check if token is expired
OAuthProvider.prototype.isTokenExpired = function() {
  if (!this.token_expires_at) {
    return false;  // No expiration set
  }
  return new Date() > new Date(this.token_expires_at);
};

module.exports = OAuthProvider;
