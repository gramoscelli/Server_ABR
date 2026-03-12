/**
 * Incomes Routes - Similar structure to expenses
 */
const express = require('express');
const router = express.Router();
const { Income, Account, PlanDeCuentas, accountingDb } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { fixEncoding } = require('../../utils/encoding');
const { buildDateFilter } = require('../../utils/dateFilter');

// Fix encoding for income data
function fixIncomeEncoding(income) {
  if (!income) return income;
  const fixed = income.toJSON ? income.toJSON() : { ...income };
  if (fixed.description) fixed.description = fixEncoding(fixed.description);
  if (fixed.notes) fixed.notes = fixEncoding(fixed.notes);
  if (fixed.planCta?.nombre) fixed.planCta.nombre = fixEncoding(fixed.planCta.nombre);
  if (fixed.account?.name) fixed.account.name = fixEncoding(fixed.account.name);
  if (fixed.originPlanCta?.nombre) fixed.originPlanCta.nombre = fixEncoding(fixed.originPlanCta.nombre);
  if (fixed.destinationPlanCta?.nombre) fixed.destinationPlanCta.nombre = fixEncoding(fixed.destinationPlanCta.nombre);
  return fixed;
}

// Common include for double-entry plan de cuentas associations
const planCtaInclude = [
  {
    model: PlanDeCuentas, as: 'originPlanCta', required: false,
    attributes: ['id', 'codigo', 'nombre', 'tipo', 'grupo'],
    include: [{ model: Account, as: 'accounts', required: false, attributes: ['id', 'name', 'type', 'current_balance'] }]
  },
  {
    model: PlanDeCuentas, as: 'destinationPlanCta', required: false,
    attributes: ['id', 'codigo', 'nombre', 'tipo', 'grupo'],
    include: [{ model: Account, as: 'accounts', required: false, attributes: ['id', 'name', 'type', 'current_balance'] }]
  },
  { model: PlanDeCuentas, as: 'planCta', required: false, attributes: ['id', 'codigo', 'nombre', 'tipo', 'grupo'] },
  { model: Account, as: 'account', required: false, attributes: ['id', 'name', 'type'] }
];

// GET all incomes
router.get('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { start_date, end_date, plan_cta_id, account_id, page = 1, limit = 50 } = req.query;
    const where = {};
    const dateFilter = buildDateFilter(start_date, end_date);
    if (dateFilter) where.date = dateFilter;
    if (plan_cta_id) where.plan_cta_id = plan_cta_id;
    if (account_id) where.account_id = account_id;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: incomes } = await Income.findAndCountAll({
      where,
      include: planCtaInclude,
      order: [['date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const totalAmount = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    const fixedIncomes = incomes.map(fixIncomeEncoding);
    res.json({
      success: true,
      data: fixedIncomes,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) },
      summary: { totalAmount: totalAmount.toFixed(2), count: incomes.length }
    });
  } catch (error) {
    console.error('Error fetching incomes:', error);
    res.status(500).json({ success: false, error: 'Error al obtener ingresos', message: error.message });
  }
});

// GET single income
router.get('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const income = await Income.findByPk(req.params.id, {
      include: planCtaInclude
    });
    if (!income) return res.status(404).json({ success: false, error: 'Ingreso no encontrado' });
    res.json({ success: true, data: fixIncomeEncoding(income) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener ingreso', message: error.message });
  }
});

// POST create income
router.post('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();
  try {
    const { amount, origin_plan_cta_id, destination_plan_cta_id, date, description, attachment_url,
            account_id, plan_cta_id } = req.body;

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'El monto debe ser mayor a cero' });
    }
    if (!destination_plan_cta_id && !account_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'La cuenta de destino es requerida (destination_plan_cta_id o account_id)' });
    }

    // Resolve origin/destination from old fields if new ones not provided
    let originId = origin_plan_cta_id;
    let destId = destination_plan_cta_id;

    if (!originId && plan_cta_id) {
      originId = plan_cta_id;
    }
    if (!destId && account_id) {
      const acct = await Account.findByPk(account_id);
      if (acct) destId = acct.plan_cta_id;
    }

    // Find accounts linked to origin/destination for balance updates
    const [originAccount, destAccount] = await Promise.all([
      originId ? Account.findOne({ where: { plan_cta_id: originId } }) : null,
      destId ? Account.findOne({ where: { plan_cta_id: destId } }) : null,
    ]);

    const income = await Income.create({
      amount,
      origin_plan_cta_id: originId || null,
      destination_plan_cta_id: destId || null,
      account_id: destAccount?.id || account_id || null,
      plan_cta_id: originId || plan_cta_id || null,
      date: date || new Date(),
      description: description || null,
      attachment_url: attachment_url || null,
      user_id: req.user.id
    }, { transaction });

    // Update balances
    if (originAccount) await originAccount.updateBalance(parseFloat(amount), false, transaction);
    if (destAccount) await destAccount.updateBalance(parseFloat(amount), true, transaction);

    await transaction.commit();

    const createdIncome = await Income.findByPk(income.id, {
      include: planCtaInclude
    });
    res.status(201).json({ success: true, message: 'Ingreso creado exitosamente', data: createdIncome });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating income:', error);
    res.status(500).json({ success: false, error: 'Error al crear ingreso', message: error.message });
  }
});

// PUT update income
router.put('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();
  try {
    const income = await Income.findByPk(req.params.id);
    if (!income) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Ingreso no encontrado' });
    }

    const { amount, plan_cta_id, account_id, date, description, attachment_url,
            origin_plan_cta_id, destination_plan_cta_id } = req.body;

    const oldAmount = parseFloat(income.amount);
    const newAmount = amount !== undefined ? parseFloat(amount) : oldAmount;
    const amountOrAccountChanged = amount !== undefined || account_id !== undefined ||
      origin_plan_cta_id !== undefined || destination_plan_cta_id !== undefined;

    if (amountOrAccountChanged) {
      // Revert old balance changes
      const [oldOriginAccount, oldDestAccount] = await Promise.all([
        income.origin_plan_cta_id ? Account.findOne({ where: { plan_cta_id: income.origin_plan_cta_id }, transaction }) : null,
        income.destination_plan_cta_id ? Account.findOne({ where: { plan_cta_id: income.destination_plan_cta_id }, transaction }) : (income.account_id ? Account.findByPk(income.account_id, { transaction }) : null),
      ]);
      if (oldOriginAccount) await oldOriginAccount.updateBalance(oldAmount, true, transaction);
      if (oldDestAccount) await oldDestAccount.updateBalance(oldAmount, false, transaction);

      // Apply new balance changes
      const newOriginId = origin_plan_cta_id !== undefined ? origin_plan_cta_id : income.origin_plan_cta_id;
      const newDestId = destination_plan_cta_id !== undefined ? destination_plan_cta_id : income.destination_plan_cta_id;
      const [newOriginAccount, newDestAccount] = await Promise.all([
        newOriginId ? Account.findOne({ where: { plan_cta_id: newOriginId }, transaction }) : null,
        newDestId ? Account.findOne({ where: { plan_cta_id: newDestId }, transaction }) : null,
      ]);
      if (newOriginAccount) await newOriginAccount.updateBalance(newAmount, false, transaction);
      if (newDestAccount) await newDestAccount.updateBalance(newAmount, true, transaction);
    }

    if (amount !== undefined) income.amount = amount;
    if (plan_cta_id !== undefined) income.plan_cta_id = plan_cta_id;
    if (account_id !== undefined) income.account_id = account_id;
    if (origin_plan_cta_id !== undefined) income.origin_plan_cta_id = origin_plan_cta_id;
    if (destination_plan_cta_id !== undefined) income.destination_plan_cta_id = destination_plan_cta_id;
    if (date !== undefined) income.date = date;
    if (description !== undefined) income.description = description;
    if (attachment_url !== undefined) income.attachment_url = attachment_url;

    await income.save({ transaction });
    await transaction.commit();

    const updatedIncome = await Income.findByPk(income.id, {
      include: planCtaInclude
    });
    res.json({ success: true, message: 'Ingreso actualizado exitosamente', data: updatedIncome });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: 'Error al actualizar ingreso', message: error.message });
  }
});

// DELETE income
router.delete('/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  const transaction = await accountingDb.transaction();
  try {
    const income = await Income.findByPk(req.params.id);
    if (!income) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Ingreso no encontrado' });
    }

    // Revert balance changes (reverse of create: origin gets money back, destination loses)
    const [originAccount, destAccount] = await Promise.all([
      income.origin_plan_cta_id ? Account.findOne({ where: { plan_cta_id: income.origin_plan_cta_id } }) : null,
      income.destination_plan_cta_id ? Account.findOne({ where: { plan_cta_id: income.destination_plan_cta_id } }) : (income.account_id ? Account.findByPk(income.account_id) : null),
    ]);
    if (originAccount) await originAccount.updateBalance(parseFloat(income.amount), true, transaction);
    if (destAccount) await destAccount.updateBalance(parseFloat(income.amount), false, transaction);
    await income.destroy({ transaction });
    await transaction.commit();

    res.json({ success: true, message: 'Ingreso eliminado exitosamente' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: 'Error al eliminar ingreso', message: error.message });
  }
});

module.exports = router;
