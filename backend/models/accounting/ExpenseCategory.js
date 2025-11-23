/**
 * ExpenseCategory Model
 * Represents expense categories with hierarchical structure
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const ExpenseCategory = accountingDb.define('expense_categories', {
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
      model: 'expense_categories',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#6B7280',
    validate: {
      is: /^#[0-9A-Fa-f]{6}$/
    }
  },
  budget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  tableName: 'expense_categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
ExpenseCategory.hasMany(ExpenseCategory, {
  as: 'subcategories',
  foreignKey: 'parent_id'
});

ExpenseCategory.belongsTo(ExpenseCategory, {
  as: 'parent',
  foreignKey: 'parent_id'
});

module.exports = ExpenseCategory;
