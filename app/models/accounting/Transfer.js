/**
 * Transfer Model
 * Represents transfers between accounts
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');
const Account = require('./Account');
const TransferType = require('./TransferType');

const Transfer = accountingDb.define('transfers', {
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
  from_account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'accounts',
      key: 'id'
    }
  },
  to_account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'accounts',
      key: 'id'
    }
  },
  transfer_type_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'transfer_types',
      key: 'id'
    }
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
  tableName: 'transfers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  validate: {
    differentAccounts() {
      if (this.from_account_id === this.to_account_id) {
        throw new Error('From and To accounts must be different');
      }
    }
  }
});

// Define associations
Transfer.belongsTo(Account, {
  as: 'fromAccount',
  foreignKey: 'from_account_id'
});

Transfer.belongsTo(Account, {
  as: 'toAccount',
  foreignKey: 'to_account_id'
});

Transfer.belongsTo(TransferType, {
  as: 'transferType',
  foreignKey: 'transfer_type_id'
});

module.exports = Transfer;
