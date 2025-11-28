/**
 * QuotationRequest Model (RFQ - Request for Quotation)
 * Represents requests sent to suppliers for price quotations
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const QuotationRequest = accountingDb.define('quotation_requests', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  rfq_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'RFQ-YYYY-NNNN format'
  },
  purchase_request_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchase_requests',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  specifications: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deadline: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Fecha límite para recibir cotizaciones'
  },
  status: {
    type: DataTypes.ENUM('open', 'closed', 'cancelled'),
    defaultValue: 'open'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'References abr.usuarios.id'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'quotation_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/**
 * Generate next RFQ number
 * @returns {Promise<string>} Next RFQ number in format RFQ-YYYY-NNNN
 */
QuotationRequest.generateRfqNumber = async function() {
  const year = new Date().getFullYear();
  const prefix = `RFQ-${year}-`;

  const lastRfq = await this.findOne({
    where: {
      rfq_number: {
        [require('sequelize').Op.like]: `${prefix}%`
      }
    },
    order: [['rfq_number', 'DESC']]
  });

  let nextNumber = 1;
  if (lastRfq) {
    const lastNumber = parseInt(lastRfq.rfq_number.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

module.exports = QuotationRequest;
