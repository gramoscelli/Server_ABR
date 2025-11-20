/**
 * CashReconciliation Model
 * Represents daily cash reconciliation (arqueos de caja)
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');
const Account = require('./Account');

const CashReconciliation = accountingDb.define('cash_reconciliations', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'accounts',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  opening_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  closing_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  expected_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  difference: {
    type: DataTypes.VIRTUAL,
    get() {
      return parseFloat(this.closing_balance) - parseFloat(this.expected_balance);
    }
  },
  notes: {
    type: DataTypes.TEXT,
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
  tableName: 'cash_reconciliations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['account_id', 'date']
    }
  ]
});

// Define associations
CashReconciliation.belongsTo(Account, {
  as: 'account',
  foreignKey: 'account_id'
});

module.exports = CashReconciliation;
