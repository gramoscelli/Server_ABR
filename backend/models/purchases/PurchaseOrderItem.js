/**
 * PurchaseOrderItem Model
 * Line items for purchase orders
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const PurchaseOrderItem = accountingDb.define('purchase_order_items', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchase_orders',
      key: 'id'
    }
  },
  quotation_item_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'quotation_items',
      key: 'id'
    }
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
  // total_price is a generated column in MySQL
  received_quantity: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
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
  tableName: 'purchase_order_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  getterMethods: {
    total_price() {
      return parseFloat(this.quantity) * parseFloat(this.unit_price);
    },
    pending_quantity() {
      return parseFloat(this.quantity) - parseFloat(this.received_quantity);
    }
  }
});

module.exports = PurchaseOrderItem;
