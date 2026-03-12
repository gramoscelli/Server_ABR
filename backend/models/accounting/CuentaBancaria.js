/**
 * CuentaBancaria Model (Bank Account Extension)
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const CuentaBancaria = accountingDb.define('CuentaBancaria', {
  id_cuenta: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  banco: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notNull: { msg: 'El banco es obligatorio' }
    }
  },
  nro_cuenta: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  cbu: {
    type: DataTypes.STRING(22),
    allowNull: true
  },
  alias: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  moneda: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'ARS'
  },
  tipo_cuenta: {
    type: DataTypes.ENUM('caja_ahorro', 'cuenta_corriente'),
    allowNull: true
  },
  activa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'cuenta_bancaria',
  timestamps: true,
  underscored: true
});

module.exports = CuentaBancaria;
