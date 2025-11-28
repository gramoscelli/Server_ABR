/**
 * PurchaseRequestHistory Model
 * Audit trail for purchase request status changes
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const PurchaseRequestHistory = accountingDb.define('purchase_request_history', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  purchase_request_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchase_requests',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'created, submitted, approved, rejected, etc.'
  },
  from_status: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  to_status: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  comments: {
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
  }
}, {
  tableName: 'purchase_request_history',
  timestamps: false,
  createdAt: 'created_at'
});

/**
 * Log a status change
 * @param {number} requestId - Purchase request ID
 * @param {string} action - Action performed
 * @param {string} fromStatus - Previous status
 * @param {string} toStatus - New status
 * @param {number} userId - User who performed the action
 * @param {string} comments - Optional comments
 * @param {object} transaction - Optional Sequelize transaction
 */
PurchaseRequestHistory.logChange = async function(requestId, action, fromStatus, toStatus, userId, comments = null, transaction = null) {
  const options = transaction ? { transaction } : {};
  return this.create({
    purchase_request_id: requestId,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    user_id: userId,
    comments
  }, options);
};

module.exports = PurchaseRequestHistory;
