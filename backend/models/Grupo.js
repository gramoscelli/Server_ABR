/**
 * Grupo Model (Sequelize)
 * Represents the grupos table (Member Groups)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Grupo = sequelize.define('grupos', {
  Gr_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: false,
    defaultValue: 0
  },
  Gr_Nombre: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nombre del grupo'
  },
  Gr_Titulo: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'Título del grupo'
  },
  TG_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
    comment: 'Tipo de grupo'
  },
  Gr_Cobrable: {
    type: DataTypes.ENUM('Y', 'N'),
    allowNull: false,
    defaultValue: 'N',
    comment: 'Indica si el grupo es cobrable'
  },
  Gr_Cuota: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0,
    comment: 'Monto de la cuota'
  },
  Gr_Habilitado: {
    type: DataTypes.ENUM('Y', 'N'),
    allowNull: false,
    defaultValue: 'Y',
    comment: 'Indica si el grupo está habilitado'
  },
  Gr_UsaDebito: {
    type: DataTypes.ENUM('Y', 'N'),
    allowNull: false,
    defaultValue: 'Y',
    comment: 'Indica si usa débito automático'
  },
  Gr_EsEmpresa: {
    type: DataTypes.ENUM('Y', 'N'),
    allowNull: false,
    defaultValue: 'N',
    comment: 'Indica si es una empresa'
  }
}, {
  tableName: 'grupos',
  timestamps: false,
  indexes: [
    {
      fields: ['Gr_ID']
    },
    {
      fields: ['TG_ID']
    }
  ]
});

// Define associations
Grupo.associate = (models) => {
  Grupo.hasMany(models.Socio, {
    foreignKey: 'Gr_ID',
    as: 'socios'
  });
};

module.exports = Grupo;
