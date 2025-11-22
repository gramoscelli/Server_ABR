/**
 * TipoDocumento Model (Sequelize)
 * Represents the tipodoc table (Document Types)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TipoDocumento = sequelize.define('tipodoc', {
  TD_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  TD_Tipo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Nombre del tipo de documento (DNI, LC, LE, etc.)'
  }
}, {
  tableName: 'tipodoc',
  timestamps: false
});

module.exports = TipoDocumento;
