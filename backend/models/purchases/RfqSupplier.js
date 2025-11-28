/**
 * RfqSupplier Model
 * Junction table for suppliers invited to submit quotations
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const RfqSupplier = accountingDb.define('rfq_suppliers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quotation_request_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'quotation_requests',
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
  invited_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  notified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  responded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  tableName: 'rfq_suppliers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['quotation_request_id', 'supplier_id']
    }
  ]
});

module.exports = RfqSupplier;
