/**
 * CuentaEfectivo Model (Cash Account Extension)
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const CuentaEfectivo = accountingDb.define('CuentaEfectivo', {
  id_cuenta: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  sucursal: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  responsable: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  moneda: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'ARS'
  },
  permite_arqueo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'cuenta_efectivo',
  timestamps: true,
  underscored: true
});

module.exports = CuentaEfectivo;
