/**
 * Models Index
 * Centralizes all Sequelize models and defines relationships
 */

const { sequelize } = require('../config/database');
const User = require('./User');
const Role = require('./Role');
const Resource = require('./Resource');
const RolePermission = require('./RolePermission');
const ApiKey = require('./ApiKey');
const RefreshToken = require('./RefreshToken');
const CsrfToken = require('./CsrfToken');
const OAuthProvider = require('./OAuthProvider');
const CobroCuota = require('./CobroCuota');
const Socio = require('./Socio');
const Grupo = require('./Grupo');
const TipoDocumento = require('./TipoDocumento');
const Cobrador = require('./Cobrador');
const Adicional = require('./Adicional');
const Setting = require('./Setting');

/**
 * Define model associations (relationships)
 */

// ===== Authentication Models =====

// Role has many Users
Role.hasMany(User, {
  foreignKey: 'role_id',
  as: 'users'
});

User.belongsTo(Role, {
  foreignKey: 'role_id',
  as: 'role'
});

// ===== 3NF Normalized Permission Associations =====

// Role has many RolePermissions
Role.hasMany(RolePermission, {
  foreignKey: 'role_id',
  as: 'rolePermissions',
  onDelete: 'CASCADE'
});

RolePermission.belongsTo(Role, {
  foreignKey: 'role_id',
  as: 'role'
});

// Resource has many RolePermissions
Resource.hasMany(RolePermission, {
  foreignKey: 'resource_id',
  as: 'rolePermissions',
  onDelete: 'CASCADE'
});

RolePermission.belongsTo(Resource, {
  foreignKey: 'resource_id',
  as: 'resource'
});

// Role belongs to many Resources through RolePermissions (many-to-many)
Role.belongsToMany(Resource, {
  through: RolePermission,
  foreignKey: 'role_id',
  otherKey: 'resource_id',
  as: 'resources'
});

Resource.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'resource_id',
  otherKey: 'role_id',
  as: 'roles'
});

// User has many API Keys
User.hasMany(ApiKey, {
  foreignKey: 'user_id',
  as: 'apiKeys',
  onDelete: 'CASCADE'
});

ApiKey.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User has many Refresh Tokens
User.hasMany(RefreshToken, {
  foreignKey: 'user_id',
  as: 'refreshTokens',
  onDelete: 'CASCADE'
});

RefreshToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User has many CSRF Tokens (optional association)
User.hasMany(CsrfToken, {
  foreignKey: 'user_id',
  as: 'csrfTokens'
});

CsrfToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User has many OAuth Providers
User.hasMany(OAuthProvider, {
  foreignKey: 'user_id',
  as: 'oauthProviders',
  onDelete: 'CASCADE'
});

OAuthProvider.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// ===== Business Logic Models =====

// Grupo has many Socios
Grupo.hasMany(Socio, {
  foreignKey: 'Gr_ID',
  as: 'socios'
});

Socio.belongsTo(Grupo, {
  foreignKey: 'Gr_ID',
  as: 'grupo'
});

// Socio has many CobroCuotas
Socio.hasMany(CobroCuota, {
  foreignKey: 'So_ID',
  as: 'cuotas'
});

CobroCuota.belongsTo(Socio, {
  foreignKey: 'So_ID',
  as: 'socio'
});

// ===== Socios Related Models =====

// Socio belongs to TipoDocumento
Socio.belongsTo(TipoDocumento, {
  foreignKey: 'TD_ID',
  as: 'tipoDocumento'
});

TipoDocumento.hasMany(Socio, {
  foreignKey: 'TD_ID',
  as: 'socios'
});

// Socio belongs to Cobrador
Socio.belongsTo(Cobrador, {
  foreignKey: 'Co_ID',
  as: 'cobrador'
});

Cobrador.hasMany(Socio, {
  foreignKey: 'Co_ID',
  as: 'socios'
});

// Socio has many Adicionales
Socio.hasMany(Adicional, {
  foreignKey: 'So_ID',
  as: 'adicionales'
});

Adicional.belongsTo(Socio, {
  foreignKey: 'So_ID',
  as: 'socio'
});

// Adicional belongs to TipoDocumento
Adicional.belongsTo(TipoDocumento, {
  foreignKey: 'TD_ID',
  as: 'tipoDocumento'
});

/**
 * Sync models with database
 * WARNING: Use { alter: true } only in development
 * In production, use migrations instead
 */
async function syncModels(options = {}) {
  try {
    await sequelize.sync(options);
    console.log('✅ Models synchronized with database');
  } catch (error) {
    console.error('❌ Error synchronizing models:', error.message);
    throw error;
  }
}

module.exports = {
  sequelize,
  // Auth models
  User,
  Role,
  Resource,
  RolePermission,
  ApiKey,
  RefreshToken,
  CsrfToken,
  OAuthProvider,
  // Business models
  CobroCuota,
  Socio,
  Grupo,
  TipoDocumento,
  Cobrador,
  Adicional,
  // Configuration
  Setting,
  // Utility
  syncModels
};
