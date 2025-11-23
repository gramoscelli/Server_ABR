/**
 * CobroCuota Model (Sequelize)
 * Represents the cobrocuotas table (Fee/Payment collection)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CobroCuota = sequelize.define('cobrocuotas', {
  CC_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: false,
    defaultValue: 0
  },
  CC_Anio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Año de la cuota'
  },
  CC_Mes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Mes de la cuota (1-12)'
  },
  CC_Valor: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Valor de la cuota'
  },
  Co_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: 'ID del cobrador'
  },
  So_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    references: {
      model: 'socios',
      key: 'So_ID'
    },
    comment: 'ID del socio'
  },
  CC_Anulado: {
    type: DataTypes.ENUM('Y', 'N'),
    allowNull: false,
    defaultValue: 'N',
    comment: 'Indica si la cuota está anulada'
  },
  CC_FechaEmision: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de emisión de la cuota'
  },
  Em_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: 'ID del emisor'
  },
  CC_FechaAnulado: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de anulación'
  },
  CC_Cobrado: {
    type: DataTypes.ENUM('N', 'Y'),
    allowNull: false,
    defaultValue: 'N',
    comment: 'Indica si la cuota fue cobrada'
  },
  CC_FechaCobrado: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de cobro'
  },
  CC_PrintCount: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: 'Cantidad de veces impresa'
  },
  TC_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: 'ID del tipo de cuota'
  },
  Re_ID: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: 'ID del recibo'
  },
  CC_Debito: {
    type: DataTypes.ENUM('N', 'Y'),
    allowNull: false,
    defaultValue: 'N',
    comment: 'Indica si es débito automático'
  }
}, {
  tableName: 'cobrocuotas',
  timestamps: false,
  indexes: [
    {
      fields: ['CC_ID']
    },
    {
      fields: ['So_ID']
    },
    {
      fields: ['Co_ID']
    },
    {
      fields: ['Em_ID']
    },
    {
      fields: ['TC_ID']
    },
    {
      fields: ['Re_ID']
    }
  ]
});

// Define associations
CobroCuota.associate = (models) => {
  CobroCuota.belongsTo(models.Socio, {
    foreignKey: 'So_ID',
    as: 'socio'
  });
};

/**
 * Class methods
 */

// Find by ID range
CobroCuota.findByIdRange = async function(start, end) {
  const { Socio, Grupo } = require('./');

  return await CobroCuota.findAll({
    where: {
      CC_ID: {
        [sequelize.Sequelize.Op.between]: [start, end]
      },
      CC_Anulado: 'N',
      CC_Cobrado: {
        [sequelize.Sequelize.Op.ne]: ''
      },
      CC_Debito: 'N'
    },
    include: [{
      model: Socio,
      as: 'socio',
      attributes: ['So_ID', 'So_Nombre', 'So_Apellido', 'So_DomCob', 'Gr_ID'],
      include: [{
        model: Grupo,
        as: 'grupo',
        attributes: ['Gr_Titulo']
      }]
    }],
    order: [['CC_ID', 'ASC']],
    raw: false
  });
};

// Find by specific IDs
CobroCuota.findByIds = async function(ids) {
  const { Socio, Grupo } = require('./');

  return await CobroCuota.findAll({
    where: {
      CC_ID: {
        [sequelize.Sequelize.Op.in]: ids
      },
      CC_Anulado: 'N',
      CC_Cobrado: {
        [sequelize.Sequelize.Op.ne]: ''
      },
      CC_Debito: 'N'
    },
    include: [{
      model: Socio,
      as: 'socio',
      attributes: ['So_ID', 'So_Nombre', 'So_Apellido', 'So_DomCob', 'Gr_ID'],
      include: [{
        model: Grupo,
        as: 'grupo',
        attributes: ['Gr_Titulo']
      }]
    }],
    order: [['CC_ID', 'ASC']],
    raw: false
  });
};

module.exports = CobroCuota;
