/**
 * PurchaseOrder Model
 * Represents purchase orders/órdenes de compra
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const PurchaseOrder = accountingDb.define('purchase_orders', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'OC-YYYY-NNNN format'
  },
  purchase_request_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchase_requests',
      key: 'id'
    }
  },
  quotation_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'quotations',
      key: 'id'
    }
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'suppliers',
      key: 'id'
    }
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  tax_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'ARS'
  },
  payment_terms: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(
      'draft',
      'sent',
      'confirmed',
      'partially_received',
      'received',
      'invoiced',
      'paid',
      'cancelled'
    ),
    defaultValue: 'draft'
  },
  expected_delivery_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  actual_delivery_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  delivery_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  delivery_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'accounts',
      key: 'id'
    },
    comment: 'Cuenta contable para el pago'
  },
  expense_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'References accounting.expenses.id when invoiced'
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  invoice_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  invoice_attachment_url: {
    type: DataTypes.STRING(500),
    allowNull: true
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
  tableName: 'purchase_orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/**
 * Generate next order number
 * @returns {Promise<string>} Next order number in format OC-YYYY-NNNN
 */
PurchaseOrder.generateOrderNumber = async function() {
  const year = new Date().getFullYear();
  const prefix = `OC-${year}-`;

  const lastOrder = await this.findOne({
    where: {
      order_number: {
        [require('sequelize').Op.like]: `${prefix}%`
      }
    },
    order: [['order_number', 'DESC']]
  });

  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.order_number.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

module.exports = PurchaseOrder;
