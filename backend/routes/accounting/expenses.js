/**
 * Expenses Routes
 * CRUD operations for expenses
 */

const express = require('express');
const router = express.Router();
const { Expense, ExpenseCategory, Account, accountingDb } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { fixEncoding } = require('../../utils/encoding');

// Fix encoding for expense data (description, notes, and related category/account names)
function fixExpenseEncoding(expense) {
  if (!expense) return expense;
  const fixed = expense.toJSON ? expense.toJSON() : { ...expense };
  if (fixed.description) fixed.description = fixEncoding(fixed.description);
  if (fixed.notes) fixed.notes = fixEncoding(fixed.notes);
  if (fixed.category?.name) fixed.category.name = fixEncoding(fixed.category.name);
  if (fixed.account?.name) fixed.account.name = fixEncoding(fixed.account.name);
  return fixed;
}

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
      category_id,
      account_id,
      min_amount,
      max_amount,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};

    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date[Op.gte] = start_date;
      if (end_date) where.date[Op.lte] = end_date;
    }

    if (category_id) where.category_id = category_id;
    if (account_id) where.account_id = account_id;

    if (min_amount || max_amount) {
      where.amount = {};
      if (min_amount) where.amount[Op.gte] = min_amount;
      if (max_amount) where.amount[Op.lte] = max_amount;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: expenses } = await Expense.findAndCountAll({
      where,
      include: [
        {
          model: ExpenseCategory,
          as: 'category',
          required: false
        },
        {
          model: Account,
          as: 'account',
          attributes: ['id', 'name', 'type']
        }
      ],
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
      include: [
        {
          model: ExpenseCategory,
          as: 'category',
          include: [{
            model: ExpenseCategory,
            as: 'parent'
          }]
        },
        {
          model: Account,
          as: 'account'
        }
      ]
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
    const { amount, category_id, account_id, date, description, attachment_url } = req.body;

    // Validations
    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'El monto debe ser mayor a cero'
      });
    }

    if (!account_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'La cuenta es requerida'
      });
    }

    // Verify account exists
    const account = await Account.findByPk(account_id);
    if (!account) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Cuenta no encontrada'
      });
    }

    // Verify category if provided
    if (category_id) {
      const category = await ExpenseCategory.findByPk(category_id);
      if (!category) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Categoría no encontrada'
        });
      }
    }

    // Create expense
    const expense = await Expense.create({
      amount,
      category_id: category_id || null,
      account_id,
      date: date || new Date(),
      description: description || null,
      attachment_url: attachment_url || null,
      user_id: req.user.id
    }, { transaction });

    // Update account balance
    await account.updateBalance(parseFloat(amount), false, transaction);

    await transaction.commit();

    // Fetch created expense with relations
    const createdExpense = await Expense.findByPk(expense.id, {
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: Account, as: 'account' }
      ]
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

    const { amount, category_id, account_id, date, description, attachment_url } = req.body;

    // If amount or account changed, update balances
    if (amount !== undefined || account_id !== undefined) {
      const oldAccount = await Account.findByPk(expense.account_id);
      const newAccountId = account_id || expense.account_id;
      const oldAmount = parseFloat(expense.amount);
      const newAmount = amount !== undefined ? parseFloat(amount) : oldAmount;

      // Revert old transaction
      await oldAccount.updateBalance(oldAmount, true, transaction);

      // Apply new transaction
      const newAccount = await Account.findByPk(newAccountId);
      await newAccount.updateBalance(newAmount, false, transaction);
    }

    // Update expense
    if (amount !== undefined) expense.amount = amount;
    if (category_id !== undefined) expense.category_id = category_id;
    if (account_id !== undefined) expense.account_id = account_id;
    if (date !== undefined) expense.date = date;
    if (description !== undefined) expense.description = description;
    if (attachment_url !== undefined) expense.attachment_url = attachment_url;

    await expense.save({ transaction });

    await transaction.commit();

    // Fetch updated expense
    const updatedExpense = await Expense.findByPk(expense.id, {
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: Account, as: 'account' }
      ]
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

    // Revert account balance
    const account = await Account.findByPk(expense.account_id);
    await account.updateBalance(parseFloat(expense.amount), true, transaction);

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
    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date[Op.gte] = start_date;
      if (end_date) where.date[Op.lte] = end_date;
    }

    const expenses = await Expense.findAll({
      where,
      include: [{
        model: ExpenseCategory,
        as: 'category',
        required: false
      }]
    });

    // Group by category
    const categoryStats = {};
    let totalWithoutCategory = 0;

    expenses.forEach(exp => {
      if (exp.category) {
        const catId = exp.category.id;
        if (!categoryStats[catId]) {
          categoryStats[catId] = {
            id: catId,
            name: exp.category.name,
            color: exp.category.color,
            total: 0,
            count: 0
          };
        }
        categoryStats[catId].total += parseFloat(exp.amount);
        categoryStats[catId].count += 1;
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
        count: expenses.filter(e => !e.category).length
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
