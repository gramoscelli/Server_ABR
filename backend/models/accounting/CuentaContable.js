/**
 * CuentaContable Model (replaces PlanDeCuentas)
 * Chart of accounts with extended type support
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const CuentaContable = accountingDb.define('CuentaContable', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    validate: {
      notNull: { msg: 'El código es obligatorio' },
      isInt: { msg: 'El código debe ser un número entero' }
    }
  },
  titulo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notNull: { msg: 'El título es obligatorio' },
      notEmpty: { msg: 'El título no puede estar vacío' }
    }
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tipo: {
    type: DataTypes.ENUM('activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso'),
    allowNull: false,
    validate: {
      notNull: { msg: 'El tipo es obligatorio' },
      isIn: {
        args: [['activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso']],
        msg: 'Tipo inválido'
      }
    }
  },
  subtipo: {
    type: DataTypes.ENUM('efectivo', 'bancaria', 'cobro_electronico', 'credito_cobrar', 'pasivo_liquidar'),
    allowNull: true,
    defaultValue: null
  },
  requiere_detalle: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  grupo: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      notNull: { msg: 'El grupo es obligatorio' }
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'cuenta_contable',
  timestamps: true,
  underscored: true
});

module.exports = CuentaContable;
