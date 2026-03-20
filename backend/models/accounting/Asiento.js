/**
 * Asiento Model (Journal Entry Header)
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const Asiento = accountingDb.define('Asiento', {
  id_asiento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notNull: { msg: 'La fecha es obligatoria' },
      isDate: { msg: 'Fecha inválida' }
    }
  },
  nro_comprobante: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notNull: { msg: 'El número de comprobante es obligatorio' }
    }
  },
  origen: {
    type: DataTypes.ENUM('manual', 'ingreso', 'egreso', 'transferencia', 'ajuste', 'compra', 'liquidacion', 'anulacion', 'pase_subdiario'),
    allowNull: false,
    defaultValue: 'manual'
  },
  concepto: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notNull: { msg: 'El concepto es obligatorio' },
      notEmpty: { msg: 'El concepto no puede estar vacío' }
    }
  },
  estado: {
    type: DataTypes.ENUM('borrador', 'confirmado', 'anulado'),
    allowNull: false,
    defaultValue: 'borrador'
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: 'El usuario es obligatorio' }
    }
  },
  id_asiento_anulado: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'asiento',
      key: 'id_asiento'
    }
  },
  subdiario: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null
  },
  id_pase_diario: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: 'asiento',
      key: 'id_asiento'
    }
  },
  confirmado_por: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  confirmado_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  anulado_por: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  anulado_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  eliminado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  eliminado_por: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  eliminado_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'asiento',
  timestamps: true,
  underscored: true,
  defaultScope: {
    where: { eliminado: false }
  },
  scopes: {
    withDeleted: {},
    onlyDeleted: {
      where: { eliminado: true }
    }
  }
});

module.exports = Asiento;
