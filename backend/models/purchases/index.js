/**
 * Purchases Models Index
 * Exports all purchase-related models and sets up associations
 */

const { accountingDb } = require('../../config/database');

// Import models
const SupplierCategory = require('./SupplierCategory');
const Supplier = require('./Supplier');
const PurchaseCategory = require('./PurchaseCategory');
const PurchaseSettings = require('./PurchaseSettings');
const PurchaseRequest = require('./PurchaseRequest');
const PurchaseRequestItem = require('./PurchaseRequestItem');
const QuotationRequest = require('./QuotationRequest');
const RfqSupplier = require('./RfqSupplier');
const Quotation = require('./Quotation');
const QuotationItem = require('./QuotationItem');
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const PurchaseRequestHistory = require('./PurchaseRequestHistory');

// Import accounting models for cross-references
const Account = require('../accounting/Account');
const Expense = require('../accounting/Expense');

// ============================================================================
// SUPPLIER ASSOCIATIONS
// ============================================================================
SupplierCategory.hasMany(Supplier, { as: 'suppliers', foreignKey: 'category_id' });
Supplier.belongsTo(SupplierCategory, { as: 'category', foreignKey: 'category_id' });

// ============================================================================
// PURCHASE REQUEST ASSOCIATIONS
// ============================================================================
PurchaseCategory.hasMany(PurchaseRequest, { as: 'requests', foreignKey: 'category_id' });
PurchaseRequest.belongsTo(PurchaseCategory, { as: 'category', foreignKey: 'category_id' });

Supplier.hasMany(PurchaseRequest, { as: 'preferredRequests', foreignKey: 'preferred_supplier_id' });
PurchaseRequest.belongsTo(Supplier, { as: 'preferredSupplier', foreignKey: 'preferred_supplier_id' });

PurchaseRequest.hasMany(PurchaseRequestItem, { as: 'items', foreignKey: 'request_id', onDelete: 'CASCADE' });
PurchaseRequestItem.belongsTo(PurchaseRequest, { as: 'request', foreignKey: 'request_id' });

PurchaseRequest.hasMany(PurchaseRequestHistory, { as: 'history', foreignKey: 'purchase_request_id', onDelete: 'CASCADE' });
PurchaseRequestHistory.belongsTo(PurchaseRequest, { as: 'request', foreignKey: 'purchase_request_id' });

// ============================================================================
// QUOTATION REQUEST (RFQ) ASSOCIATIONS
// ============================================================================
PurchaseRequest.hasMany(QuotationRequest, { as: 'quotationRequests', foreignKey: 'purchase_request_id', onDelete: 'CASCADE' });
QuotationRequest.belongsTo(PurchaseRequest, { as: 'purchaseRequest', foreignKey: 'purchase_request_id' });

QuotationRequest.hasMany(RfqSupplier, { as: 'invitedSuppliers', foreignKey: 'quotation_request_id', onDelete: 'CASCADE' });
RfqSupplier.belongsTo(QuotationRequest, { as: 'quotationRequest', foreignKey: 'quotation_request_id' });

Supplier.hasMany(RfqSupplier, { as: 'rfqInvitations', foreignKey: 'supplier_id', onDelete: 'CASCADE' });
RfqSupplier.belongsTo(Supplier, { as: 'supplier', foreignKey: 'supplier_id' });

// ============================================================================
// QUOTATION ASSOCIATIONS
// ============================================================================
QuotationRequest.hasMany(Quotation, { as: 'quotations', foreignKey: 'quotation_request_id' });
Quotation.belongsTo(QuotationRequest, { as: 'quotationRequest', foreignKey: 'quotation_request_id' });

PurchaseRequest.hasMany(Quotation, { as: 'quotations', foreignKey: 'purchase_request_id', onDelete: 'CASCADE' });
Quotation.belongsTo(PurchaseRequest, { as: 'purchaseRequest', foreignKey: 'purchase_request_id' });

Supplier.hasMany(Quotation, { as: 'quotations', foreignKey: 'supplier_id' });
Quotation.belongsTo(Supplier, { as: 'supplier', foreignKey: 'supplier_id' });

Quotation.hasMany(QuotationItem, { as: 'items', foreignKey: 'quotation_id', onDelete: 'CASCADE' });
QuotationItem.belongsTo(Quotation, { as: 'quotation', foreignKey: 'quotation_id' });

PurchaseRequestItem.hasMany(QuotationItem, { as: 'quotationItems', foreignKey: 'request_item_id' });
QuotationItem.belongsTo(PurchaseRequestItem, { as: 'requestItem', foreignKey: 'request_item_id' });

// ============================================================================
// PURCHASE ORDER ASSOCIATIONS
// ============================================================================
PurchaseRequest.hasMany(PurchaseOrder, { as: 'orders', foreignKey: 'purchase_request_id' });
PurchaseOrder.belongsTo(PurchaseRequest, { as: 'purchaseRequest', foreignKey: 'purchase_request_id' });

Quotation.hasMany(PurchaseOrder, { as: 'orders', foreignKey: 'quotation_id' });
PurchaseOrder.belongsTo(Quotation, { as: 'quotation', foreignKey: 'quotation_id' });

Supplier.hasMany(PurchaseOrder, { as: 'orders', foreignKey: 'supplier_id' });
PurchaseOrder.belongsTo(Supplier, { as: 'supplier', foreignKey: 'supplier_id' });

Account.hasMany(PurchaseOrder, { as: 'purchaseOrders', foreignKey: 'account_id' });
PurchaseOrder.belongsTo(Account, { as: 'account', foreignKey: 'account_id' });

Expense.hasMany(PurchaseOrder, { as: 'purchaseOrders', foreignKey: 'expense_id' });
PurchaseOrder.belongsTo(Expense, { as: 'expense', foreignKey: 'expense_id' });

PurchaseOrder.hasMany(PurchaseOrderItem, { as: 'items', foreignKey: 'order_id', onDelete: 'CASCADE' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { as: 'order', foreignKey: 'order_id' });

QuotationItem.hasMany(PurchaseOrderItem, { as: 'orderItems', foreignKey: 'quotation_item_id' });
PurchaseOrderItem.belongsTo(QuotationItem, { as: 'quotationItem', foreignKey: 'quotation_item_id' });

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  accountingDb,
  // Categories
  SupplierCategory,
  PurchaseCategory,
  // Suppliers
  Supplier,
  // Settings
  PurchaseSettings,
  // Purchase Requests
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseRequestHistory,
  // Quotations
  QuotationRequest,
  RfqSupplier,
  Quotation,
  QuotationItem,
  // Purchase Orders
  PurchaseOrder,
  PurchaseOrderItem
};
