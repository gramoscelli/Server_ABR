/**
 * Quotation Model
 * Represents quotations/presupuestos received from suppliers
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const Quotation = accountingDb.define('quotations', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quotation_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Número de presupuesto del proveedor'
  },
  quotation_request_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'quotation_requests',
      key: 'id'
    }
  },
  purchase_request_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchase_requests',
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
    allowNull: false,
    validate: {
      min: 0
    }
  },
  tax_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'ARS'
  },
  payment_terms: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Condiciones de pago ofrecidas'
  },
  delivery_time: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Tiempo de entrega estimado'
  },
  valid_until: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('received', 'under_review', 'selected', 'rejected'),
    defaultValue: 'received'
  },
  is_selected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  selection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Razón de selección/rechazo'
  },
  attachment_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  received_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'References abr.usuarios.id'
  },
  received_at: {
    type: DataTypes.DATEONLY,
    allowNull: false
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
  tableName: 'quotations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Quotation;
