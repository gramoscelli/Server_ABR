/**
 * AsientoDetalle Model (Journal Entry Detail Lines)
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const AsientoDetalle = accountingDb.define('AsientoDetalle', {
  id_detalle: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_asiento: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_cuenta: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tipo_mov: {
    type: DataTypes.ENUM('debe', 'haber'),
    allowNull: false,
    validate: {
      notNull: { msg: 'El tipo de movimiento es obligatorio' },
      isIn: {
        args: [['debe', 'haber']],
        msg: 'El tipo de movimiento debe ser "debe" o "haber"'
      }
    }
  },
  importe: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      notNull: { msg: 'El importe es obligatorio' },
      min: {
        args: [0.01],
        msg: 'El importe debe ser mayor a 0'
      }
    }
  },
  referencia_operativa: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'asiento_detalle',
  timestamps: false,
  underscored: true
});

module.exports = AsientoDetalle;
