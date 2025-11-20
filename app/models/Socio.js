/**
 * Socio Model (Sequelize)
 * Represents the socios table (Members/Partners)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Socio = sequelize.define('socios', {
  So_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: false,
    defaultValue: 0
  },
  Co_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0
  },
  So_Apellido: {
    type: DataTypes.STRING(60),
    allowNull: false
  },
  So_Nombre: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  So_DomRes: {
    type: DataTypes.STRING(60),
    allowNull: true,
    comment: 'Domicilio de residencia'
  },
  So_DomCob: {
    type: DataTypes.STRING(60),
    allowNull: true,
    comment: 'Domicilio de cobro'
  },
  So_Telef: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  TD_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    defaultValue: 0,
    comment: 'Tipo de documento'
  },
  So_NroDoc: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Número de documento (DNI, etc.)'
  },
  So_FecNac: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha de nacimiento'
  },
  So_AnioIngre: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: 'Año de ingreso'
  },
  So_MesIngre: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: 'Mes de ingreso'
  },
  So_NotaCob: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas sobre cobro'
  },
  So_Obs: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observaciones generales'
  },
  Gr_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    references: {
      model: 'grupos',
      key: 'Gr_ID'
    }
  },
  So_Foto: {
    type: DataTypes.BLOB('long'),
    allowNull: true,
    comment: 'Foto del socio'
  },
  So_PersFisica: {
    type: DataTypes.ENUM('N', 'Y'),
    allowNull: false,
    defaultValue: 'Y',
    comment: 'Es persona física (Y) o jurídica (N)'
  },
  So_Email: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  So_Aut_Apellido: {
    type: DataTypes.STRING(60),
    allowNull: true,
    comment: 'Apellido del autorizado'
  },
  So_Aut_Nombre: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Nombre del autorizado'
  },
  So_Aut_Domi: {
    type: DataTypes.STRING(60),
    allowNull: true,
    comment: 'Domicilio del autorizado'
  },
  So_Aut_Telef: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: 'Teléfono del autorizado'
  },
  So_Aut_TipoDoc: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: 'Tipo de documento del autorizado'
  },
  So_Aut_NroDoc: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Número de documento del autorizado'
  },
  So_Fallecido: {
    type: DataTypes.ENUM('Y', 'N'),
    allowNull: false,
    defaultValue: 'Y',
    comment: 'Indica si el socio falleció'
  },
  So_DiferenciaCuota: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Diferencia en cuota (descuento o recargo)'
  },
  So_NroCarnet: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: 'Número de carnet'
  }
}, {
  tableName: 'socios',
  timestamps: false,
  indexes: [
    {
      fields: ['So_ID']
    },
    {
      fields: ['Gr_ID']
    },
    {
      fields: ['Co_ID']
    },
    {
      fields: ['TD_ID']
    },
    {
      fields: ['So_Aut_TipoDoc']
    },
    {
      fields: ['So_Apellido']
    },
    {
      fields: ['So_NroDoc']
    }
  ]
});

// Define associations
Socio.associate = (models) => {
  Socio.belongsTo(models.Grupo, {
    foreignKey: 'Gr_ID',
    as: 'grupo'
  });

  Socio.hasMany(models.CobroCuota, {
    foreignKey: 'So_ID',
    as: 'cuotas'
  });
};

module.exports = Socio;
