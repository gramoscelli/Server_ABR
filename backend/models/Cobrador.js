/**
 * Cobrador Model (Sequelize)
 * Represents the cobradores table (Fee Collectors)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cobrador = sequelize.define('cobradores', {
  Co_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  Co_Nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Nombre del cobrador'
  },
  Co_Habilitado: {
    type: DataTypes.ENUM('Y', 'N'),
    allowNull: false,
    defaultValue: 'Y',
    comment: 'Indica si el cobrador está habilitado'
  }
}, {
  tableName: 'cobradores',
  timestamps: false
});

module.exports = Cobrador;
