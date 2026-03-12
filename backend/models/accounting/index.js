/**
 * Accounting Models Index
 * Exports all accounting models and sets up associations
 */

const { accountingDb } = require('../../config/database');
const TransferType = require('./TransferType');
const PlanDeCuentas = require('./PlanDeCuentas');
const Account = require('./Account');
const Expense = require('./Expense');
const Income = require('./Income');
const Transfer = require('./Transfer');
const CashReconciliation = require('./CashReconciliation');

// Setup associations
TransferType.hasMany(Transfer, { as: 'transfers', foreignKey: 'transfer_type_id' });

// Plan de Cuentas associations
PlanDeCuentas.hasMany(Expense, { as: 'expenses', foreignKey: 'plan_cta_id' });
PlanDeCuentas.hasMany(Income, { as: 'incomes', foreignKey: 'plan_cta_id' });
PlanDeCuentas.hasMany(Account, { as: 'accounts', foreignKey: 'plan_cta_id' });

Expense.belongsTo(PlanDeCuentas, { as: 'planCta', foreignKey: 'plan_cta_id' });
Income.belongsTo(PlanDeCuentas, { as: 'planCta', foreignKey: 'plan_cta_id' });
Account.belongsTo(PlanDeCuentas, { as: 'planCta', foreignKey: 'plan_cta_id' });

Account.hasMany(Expense, { as: 'expenses', foreignKey: 'account_id' });
Account.hasMany(Income, { as: 'incomes', foreignKey: 'account_id' });
Account.hasMany(Transfer, { as: 'outgoingTransfers', foreignKey: 'from_account_id' });
Account.hasMany(Transfer, { as: 'incomingTransfers', foreignKey: 'to_account_id' });
Account.hasMany(CashReconciliation, { as: 'reconciliations', foreignKey: 'account_id' });

// Origin/destination associations for double-entry bookkeeping
Expense.belongsTo(PlanDeCuentas, { as: 'originPlanCta', foreignKey: 'origin_plan_cta_id' });
Expense.belongsTo(PlanDeCuentas, { as: 'destinationPlanCta', foreignKey: 'destination_plan_cta_id' });
Income.belongsTo(PlanDeCuentas, { as: 'originPlanCta', foreignKey: 'origin_plan_cta_id' });
Income.belongsTo(PlanDeCuentas, { as: 'destinationPlanCta', foreignKey: 'destination_plan_cta_id' });
Transfer.belongsTo(PlanDeCuentas, { as: 'originPlanCta', foreignKey: 'origin_plan_cta_id' });
Transfer.belongsTo(PlanDeCuentas, { as: 'destinationPlanCta', foreignKey: 'destination_plan_cta_id' });

module.exports = {
  accountingDb,
  TransferType,
  PlanDeCuentas,
  Account,
  Expense,
  Income,
  Transfer,
  CashReconciliation
};
