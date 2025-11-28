/**
 * QuotationItem Model
 * Line items for quotations
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const QuotationItem = accountingDb.define('quotation_items', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quotation_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'quotations',
      key: 'id'
    }
  },
  request_item_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'purchase_request_items',
      key: 'id'
    },
    comment: 'Referencia al item original de la solicitud'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1
  },
  unit: {
    type: DataTypes.STRING(50),
    defaultValue: 'unidad'
  },
  unit_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  // total_price is a generated column in MySQL, we'll calculate it in the getter
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
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
  tableName: 'quotation_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  getterMethods: {
    total_price() {
      return parseFloat(this.quantity) * parseFloat(this.unit_price);
    }
  }
});

module.exports = QuotationItem;
