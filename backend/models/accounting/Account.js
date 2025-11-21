/**
 * Account Model
 * Represents financial accounts (cash, bank accounts, etc.)
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const Account = accountingDb.define('accounts', {
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
  type: {
    type: DataTypes.ENUM('cash', 'bank', 'other'),
    allowNull: false,
    defaultValue: 'bank'
  },
  account_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'ARS'
  },
  initial_balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  current_balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  tableName: 'accounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Instance methods
Account.prototype.updateBalance = async function(amount, isIncome = true, transaction = null) {
  const newBalance = parseFloat(this.current_balance) + (isIncome ? amount : -amount);
  this.current_balance = newBalance;
  await this.save({ transaction });
  return this.current_balance;
};

module.exports = Account;
