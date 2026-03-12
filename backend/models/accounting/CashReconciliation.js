/**
 * CashReconciliation Model
 * Represents daily cash reconciliation (arqueos de caja)
 * Now references cuenta_contable instead of accounts
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const CashReconciliation = accountingDb.define('cash_reconciliations', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_cuenta: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'cuenta_contable',
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
      fields: ['id_cuenta', 'date']
    }
  ]
});

module.exports = CashReconciliation;
