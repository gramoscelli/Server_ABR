/**
 * Income Model
 * Represents income transactions
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');
const Account = require('./Account');

const Income = accountingDb.define('incomes', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  plan_cta_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'plan_de_cuentas',
      key: 'id'
    },
    comment: 'Links to chart of accounts (plan de cuentas)'
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'accounts',
      key: 'id'
    }
  },
  origin_plan_cta_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'plan_de_cuentas',
      key: 'id'
    },
    comment: 'Origin account in chart of accounts (double-entry: money leaves here)'
  },
  destination_plan_cta_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'plan_de_cuentas',
      key: 'id'
    },
    comment: 'Destination account in chart of accounts (double-entry: money enters here)'
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachment_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  user_id: {
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
  tableName: 'incomes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
Income.belongsTo(Account, {
  as: 'account',
  foreignKey: 'account_id'
});

module.exports = Income;
