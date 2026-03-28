/**
 * AuditLog Model - Immutable audit log for admin actions
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  accion: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  entidad: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  entidad_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  detalle: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'audit_log',
  timestamps: false,
  underscored: true
});

module.exports = AuditLog;
