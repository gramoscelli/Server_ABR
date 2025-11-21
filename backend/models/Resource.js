/**
 * Resource Model (Sequelize)
 * Represents system resources for permission management (3NF normalized)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Resource = sequelize.define('resources', {
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
      isIn: [['*', 'users', 'roles', 'api_keys', 'library_associateds']]
    },
    comment: 'Resource name: * (wildcard for root), users, roles, api_keys, library_associateds'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
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
  tableName: 'resources',
  timestamps: false,  // We handle timestamps manually
  indexes: [
    {
      unique: true,
      fields: ['name']
    }
  ]
});

/**
 * Class methods
 */

// Find resource by name
Resource.findByName = async function(name) {
  return await Resource.findOne({ where: { name } });
};

// Get resource ID by name
Resource.getIdByName = async function(name) {
  const resource = await Resource.findByName(name);
  return resource ? resource.id : null;
};

module.exports = Resource;
