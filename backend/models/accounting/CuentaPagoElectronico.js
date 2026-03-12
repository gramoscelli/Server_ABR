/**
 * CuentaPagoElectronico Model (Electronic Payment Account Extension)
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const CuentaPagoElectronico = accountingDb.define('CuentaPagoElectronico', {
  id_cuenta: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  proveedor: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notNull: { msg: 'El proveedor es obligatorio' }
    }
  },
  tipo_medio: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  plazo_acreditacion: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  liquidacion_diferida: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'cuenta_pago_electronico',
  timestamps: true,
  underscored: true
});

module.exports = CuentaPagoElectronico;
