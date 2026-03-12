/**
 * LiquidacionElectronica Model (Electronic Settlement Tracking)
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const LiquidacionElectronica = accountingDb.define('LiquidacionElectronica', {
  id_liquidacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_cuenta: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fecha_operacion: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fecha_acreditacion: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'acreditada', 'rechazada'),
    allowNull: false,
    defaultValue: 'pendiente'
  },
  importe_bruto: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  comision: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  importe_neto: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true // Generated column
  },
  id_asiento_origen: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  id_asiento_acreditacion: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  referencia: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'liquidacion_electronica',
  timestamps: true,
  underscored: true
});

module.exports = LiquidacionElectronica;
