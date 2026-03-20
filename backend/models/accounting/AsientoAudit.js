/**
 * AsientoAudit Model - Immutable audit log for journal entry actions
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const AsientoAudit = accountingDb.define('AsientoAudit', {
  id_audit: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_asiento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'asiento',
      key: 'id_asiento'
    }
  },
  accion: {
    type: DataTypes.ENUM('creado', 'editado', 'confirmado', 'anulado', 'eliminado', 'pase_diario'),
    allowNull: false
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  detalle: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'asiento_audit',
  timestamps: false,
  underscored: true
});

module.exports = AsientoAudit;
