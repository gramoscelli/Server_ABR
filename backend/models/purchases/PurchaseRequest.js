/**
 * PurchaseRequest Model
 * Represents purchase requests/solicitudes de compra
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const PurchaseRequest = accountingDb.define('purchase_requests', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  request_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'SC-YYYY-NNNN format'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  justification: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Justificación de la necesidad'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'purchase_categories',
      key: 'id'
    }
  },
  estimated_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'ARS'
  },
  purchase_type: {
    type: DataTypes.ENUM('direct', 'price_competition', 'tender'),
    allowNull: false,
    defaultValue: 'direct'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  status: {
    type: DataTypes.ENUM(
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'in_quotation',
      'quotation_received',
      'in_evaluation',
      'order_created',
      'completed',
      'cancelled'
    ),
    defaultValue: 'draft'
  },
  preferred_supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'suppliers',
      key: 'id'
    },
    comment: 'Proveedor preferido (opcional)'
  },
  required_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha requerida de entrega'
  },
  attachment_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  requested_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'References abr.usuarios.id'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'References abr.usuarios.id'
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'purchase_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/**
 * Generate next request number
 * @returns {Promise<string>} Next request number in format SC-YYYY-NNNN
 */
PurchaseRequest.generateRequestNumber = async function() {
  const year = new Date().getFullYear();
  const prefix = `SC-${year}-`;

  const lastRequest = await this.findOne({
    where: {
      request_number: {
        [require('sequelize').Op.like]: `${prefix}%`
      }
    },
    order: [['request_number', 'DESC']]
  });

  let nextNumber = 1;
  if (lastRequest) {
    const lastNumber = parseInt(lastRequest.request_number.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

module.exports = PurchaseRequest;
