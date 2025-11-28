/**
 * PurchaseCategory Model
 * Categories for classifying purchase requests
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const PurchaseCategory = accountingDb.define('purchase_categories', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'purchase_categories',
      key: 'id'
    }
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#6B7280',
    validate: {
      is: /^#[0-9A-Fa-f]{6}$/
    }
  },
  expense_category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Categoría de gasto asociada para contabilidad'
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  tableName: 'purchase_categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Self-referencing association for hierarchical categories
PurchaseCategory.hasMany(PurchaseCategory, {
  as: 'subcategories',
  foreignKey: 'parent_id'
});

PurchaseCategory.belongsTo(PurchaseCategory, {
  as: 'parent',
  foreignKey: 'parent_id'
});

module.exports = PurchaseCategory;
