/**
 * Adicional Model (Sequelize)
 * Represents the adicionales table (Additional authorized persons for a member)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Adicional = sequelize.define('adicionales', {
  Ad_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  So_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: 'ID del socio asociado',
    references: {
      model: 'socios',
      key: 'So_ID'
    }
  },
  Ad_ApeNom: {
    type: DataTypes.STRING(160),
    allowNull: false,
    comment: 'Apellido y nombre del adicional'
  },
  TD_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: 'Tipo de documento',
    references: {
      model: 'tipodoc',
      key: 'TD_ID'
    }
  },
  Ad_DocNro: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Número de documento'
  }
}, {
  tableName: 'adicionales',
  timestamps: false
});

// Define associations
Adicional.associate = (models) => {
  Adicional.belongsTo(models.Socio, {
    foreignKey: 'So_ID',
    as: 'socio'
  });
  Adicional.belongsTo(models.TipoDocumento, {
    foreignKey: 'TD_ID',
    as: 'tipoDocumento'
  });
};

module.exports = Adicional;
