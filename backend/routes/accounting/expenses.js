/**
 * Expenses Routes
 * CRUD operations for expenses
 */

const express = require('express');
const router = express.Router();
const { Expense, Account, PlanDeCuentas, accountingDb } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { fixEncoding } = require('../../utils/encoding');
const { buildDateFilter } = require('../../utils/dateFilter');

// Fix encoding for expense data (description, notes, and related category/account names)
function fixExpenseEncoding(expense) {
  if (!expense) return expense;
  const fixed = expense.toJSON ? expense.toJSON() : { ...expense };
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

/**
 * @route   GET /api/accounting/expenses
 * @desc    Get all expenses with filters
 * @access  Private (root, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      plan_cta_id,
      account_id,
      min_amount,
      max_amount,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};

    const dateFilter = buildDateFilter(start_date, end_date);
    if (dateFilter) where.date = dateFilter;

    if (plan_cta_id) where.plan_cta_id = plan_cta_id;
    if (account_id) where.account_id = account_id;

    if (min_amount || max_amount) {
      where.amount = {};
      if (min_amount) where.amount[Op.gte] = min_amount;
      if (max_amount) where.amount[Op.lte] = max_amount;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: expenses } = await Expense.findAndCountAll({
      where,
      include: planCtaInclude,
      order: [['date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Calculate totals
    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    // Fix encoding issues
    const fixedExpenses = expenses.map(fixExpenseEncoding);

    res.json({
      success: true,
      data: fixedExpenses,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      },
      summary: {
        totalAmount: totalAmount.toFixed(2),
        count: expenses.length
      }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener egresos',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/accounting/expenses/:id
 * @desc    Get single expense
 * @access  Private (root, admin_employee)
 */
router.get('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id, {
      include: planCtaInclude
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Egreso no encontrado'
      });
    }

    res.json({
      success: true,
      data: fixExpenseEncoding(expense)
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener egreso',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/accounting/expenses
 * @desc    Create new expense
 * @access  Private (root, admin_employee)
 */
router.post('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const { amount, origin_plan_cta_id, destination_plan_cta_id, date, description, attachment_url,
            account_id, plan_cta_id } = req.body;

    // Validations
    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'El monto debe ser mayor a cero'
      });
    }

    if (!origin_plan_cta_id && !account_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'La cuenta de origen es requerida (origin_plan_cta_id o account_id)'
      });
    }

    // Resolve origin/destination from old fields if new ones not provided
    let originId = origin_plan_cta_id;
    let destId = destination_plan_cta_id;

    if (!originId && account_id) {
      const acct = await Account.findByPk(account_id);
      if (acct) originId = acct.plan_cta_id;
    }
    if (!destId && plan_cta_id) {
      destId = plan_cta_id;
    }

    // Find accounts linked to origin/destination for balance updates
    const [originAccount, destAccount] = await Promise.all([
      originId ? Account.findOne({ where: { plan_cta_id: originId } }) : null,
      destId ? Account.findOne({ where: { plan_cta_id: destId } }) : null,
    ]);

    // Create expense with all fields
    const expense = await Expense.create({
      amount,
      origin_plan_cta_id: originId || null,
      destination_plan_cta_id: destId || null,
      account_id: originAccount?.id || account_id || null,
      plan_cta_id: destId || plan_cta_id || null,
      date: date || new Date(),
      description: description || null,
      attachment_url: attachment_url || null,
      user_id: req.user.id
    }, { transaction });

    // Update balances
    if (originAccount) await originAccount.updateBalance(parseFloat(amount), false, transaction);
    if (destAccount) await destAccount.updateBalance(parseFloat(amount), true, transaction);

    await transaction.commit();

    // Fetch created expense with relations
    const createdExpense = await Expense.findByPk(expense.id, {
      include: planCtaInclude
    });

    res.status(201).json({
      success: true,
      message: 'Egreso creado exitosamente',
      data: createdExpense
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear egreso',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/accounting/expenses/:id
 * @desc    Update expense
 * @access  Private (root, admin_employee)
 */
router.put('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Egreso no encontrado'
      });
    }

    const { amount, plan_cta_id, account_id, date, description, attachment_url,
            origin_plan_cta_id, destination_plan_cta_id } = req.body;

    // If amount or account changed, update balances
    const oldAmount = parseFloat(expense.amount);
    const newAmount = amount !== undefined ? parseFloat(amount) : oldAmount;
    const amountOrAccountChanged = amount !== undefined || account_id !== undefined ||
      origin_plan_cta_id !== undefined || destination_plan_cta_id !== undefined;

    if (amountOrAccountChanged) {
      // Revert old balance changes
      const [oldOriginAccount, oldDestAccount] = await Promise.all([
        expense.origin_plan_cta_id ? Account.findOne({ where: { plan_cta_id: expense.origin_plan_cta_id }, transaction }) : (expense.account_id ? Account.findByPk(expense.account_id, { transaction }) : null),
        expense.destination_plan_cta_id ? Account.findOne({ where: { plan_cta_id: expense.destination_plan_cta_id }, transaction }) : null,
      ]);
      if (oldOriginAccount) await oldOriginAccount.updateBalance(oldAmount, true, transaction);
      if (oldDestAccount) await oldDestAccount.updateBalance(oldAmount, false, transaction);

      // Apply new balance changes
      const newOriginId = origin_plan_cta_id !== undefined ? origin_plan_cta_id : expense.origin_plan_cta_id;
      const newDestId = destination_plan_cta_id !== undefined ? destination_plan_cta_id : expense.destination_plan_cta_id;
      const [newOriginAccount, newDestAccount] = await Promise.all([
        newOriginId ? Account.findOne({ where: { plan_cta_id: newOriginId }, transaction }) : null,
        newDestId ? Account.findOne({ where: { plan_cta_id: newDestId }, transaction }) : null,
      ]);
      if (newOriginAccount) await newOriginAccount.updateBalance(newAmount, false, transaction);
      if (newDestAccount) await newDestAccount.updateBalance(newAmount, true, transaction);
    }

    // Update expense fields
    if (amount !== undefined) expense.amount = amount;
    if (plan_cta_id !== undefined) expense.plan_cta_id = plan_cta_id;
    if (account_id !== undefined) expense.account_id = account_id;
    if (origin_plan_cta_id !== undefined) expense.origin_plan_cta_id = origin_plan_cta_id;
    if (destination_plan_cta_id !== undefined) expense.destination_plan_cta_id = destination_plan_cta_id;
    if (date !== undefined) expense.date = date;
    if (description !== undefined) expense.description = description;
    if (attachment_url !== undefined) expense.attachment_url = attachment_url;

    await expense.save({ transaction });

    await transaction.commit();

    // Fetch updated expense
    const updatedExpense = await Expense.findByPk(expense.id, {
      include: planCtaInclude
    });

    res.json({
      success: true,
      message: 'Egreso actualizado exitosamente',
      data: updatedExpense
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar egreso',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/accounting/expenses/:id
 * @desc    Delete expense
 * @access  Private (root)
 */
router.delete('/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const expense = await Expense.findByPk(req.params.id);

    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Egreso no encontrado'
      });
    }

    // Revert balance changes (reverse of create: origin gets money back, destination loses)
    const [originAccount, destAccount] = await Promise.all([
      expense.origin_plan_cta_id ? Account.findOne({ where: { plan_cta_id: expense.origin_plan_cta_id } }) : (expense.account_id ? Account.findByPk(expense.account_id) : null),
      expense.destination_plan_cta_id ? Account.findOne({ where: { plan_cta_id: expense.destination_plan_cta_id } }) : null,
    ]);
    if (originAccount) await originAccount.updateBalance(parseFloat(expense.amount), true, transaction);
    if (destAccount) await destAccount.updateBalance(parseFloat(expense.amount), false, transaction);

    await expense.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Egreso eliminado exitosamente'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar egreso',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/accounting/expenses/stats/by-category
 * @desc    Get expenses statistics by category
 * @access  Private (root, admin_employee)
 */
router.get('/stats/by-category', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const where = {};
    const dateFilter = buildDateFilter(start_date, end_date);
    if (dateFilter) where.date = dateFilter;

    const expenses = await Expense.findAll({
      where,
      include: [{
        model: PlanDeCuentas,
        as: 'planCta',
        required: false,
        attributes: ['id', 'codigo', 'nombre', 'tipo', 'grupo']
      }]
    });

    // Group by plan de cuentas
    const categoryStats = {};
    let totalWithoutCategory = 0;

    expenses.forEach(exp => {
      if (exp.planCta) {
        const ctaId = exp.planCta.id;
        if (!categoryStats[ctaId]) {
          categoryStats[ctaId] = {
            id: ctaId,
            codigo: exp.planCta.codigo,
            name: exp.planCta.nombre,
            total: 0,
            count: 0
          };
        }
        categoryStats[ctaId].total += parseFloat(exp.amount);
        categoryStats[ctaId].count += 1;
      } else {
        totalWithoutCategory += parseFloat(exp.amount);
      }
    });

    const result = Object.values(categoryStats).map(cat => ({
      ...cat,
      total: cat.total.toFixed(2)
    }));

    res.json({
      success: true,
      data: result,
      uncategorized: {
        total: totalWithoutCategory.toFixed(2),
        count: expenses.filter(e => !e.planCta).length
      }
    });
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
});

module.exports = router;
