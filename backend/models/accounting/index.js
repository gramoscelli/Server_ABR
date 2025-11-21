/**
 * Accounting Models Index
 * Exports all accounting models and sets up associations
 */

const { accountingDb } = require('../../config/database');
const ExpenseCategory = require('./ExpenseCategory');
const IncomeCategory = require('./IncomeCategory');
const TransferType = require('./TransferType');
const Account = require('./Account');
const Expense = require('./Expense');
const Income = require('./Income');
const Transfer = require('./Transfer');
const CashReconciliation = require('./CashReconciliation');

// Setup associations
ExpenseCategory.hasMany(Expense, { as: 'expenses', foreignKey: 'category_id' });
IncomeCategory.hasMany(Income, { as: 'incomes', foreignKey: 'category_id' });
TransferType.hasMany(Transfer, { as: 'transfers', foreignKey: 'transfer_type_id' });

Account.hasMany(Expense, { as: 'expenses', foreignKey: 'account_id' });
Account.hasMany(Income, { as: 'incomes', foreignKey: 'account_id' });
Account.hasMany(Transfer, { as: 'outgoingTransfers', foreignKey: 'from_account_id' });
Account.hasMany(Transfer, { as: 'incomingTransfers', foreignKey: 'to_account_id' });
Account.hasMany(CashReconciliation, { as: 'reconciliations', foreignKey: 'account_id' });

module.exports = {
  accountingDb,
  ExpenseCategory,
  IncomeCategory,
  TransferType,
  Account,
  Expense,
  Income,
  Transfer,
  CashReconciliation
};
