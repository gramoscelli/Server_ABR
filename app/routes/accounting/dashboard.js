/**
 * Dashboard Routes
 * Consolidated statistics and summary for accounting dashboard
 */
const express = require('express');
const router = express.Router();
const { Account, Expense, Income, Transfer, ExpenseCategory, IncomeCategory } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');

/**
 * @route   GET /api/accounting/dashboard
 * @desc    Get dashboard summary with all accounts and period statistics
 * @access  Private (root, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Get all accounts with balances
    const accounts = await Account.findAll({
      where: { is_active: true },
      order: [['type', 'ASC'], ['name', 'ASC']]
    });

    // Calculate totals by account type
    const balanceByType = {
      cash: accounts.filter(a => a.type === 'cash').reduce((sum, a) => sum + parseFloat(a.current_balance), 0),
      bank: accounts.filter(a => a.type === 'bank').reduce((sum, a) => sum + parseFloat(a.current_balance), 0),
      other: accounts.filter(a => a.type === 'other').reduce((sum, a) => sum + parseFloat(a.current_balance), 0)
    };

    const totalBalance = balanceByType.cash + balanceByType.bank + balanceByType.other;

    // Build date filter for period statistics
    const dateWhere = {};
    if (start_date || end_date) {
      dateWhere.date = {};
      if (start_date) dateWhere.date[Op.gte] = start_date;
      if (end_date) dateWhere.date[Op.lte] = end_date;
    }

    // Get period statistics
    const [totalExpenses, totalIncomes, expensesByCategory, incomesByCategory, recentExpenses, recentIncomes, recentTransfers] = await Promise.all([
      Expense.sum('amount', { where: dateWhere }) || 0,
      Income.sum('amount', { where: dateWhere }) || 0,

      // Expenses grouped by category
      Expense.findAll({
        where: dateWhere,
        include: [{
          model: ExpenseCategory,
          as: 'category',
          required: false
        }],
        attributes: ['category_id', 'amount']
      }),

      // Incomes grouped by category
      Income.findAll({
        where: dateWhere,
        include: [{
          model: IncomeCategory,
          as: 'category',
          required: false
        }],
        attributes: ['category_id', 'amount']
      }),

      // Recent transactions
      Expense.findAll({
        limit: 5,
        order: [['date', 'DESC'], ['created_at', 'DESC']],
        include: [
          { model: ExpenseCategory, as: 'category', required: false },
          { model: Account, as: 'account', attributes: ['id', 'name'] }
        ]
      }),

      Income.findAll({
        limit: 5,
        order: [['date', 'DESC'], ['created_at', 'DESC']],
        include: [
          { model: IncomeCategory, as: 'category', required: false },
          { model: Account, as: 'account', attributes: ['id', 'name'] }
        ]
      }),

      Transfer.findAll({
        limit: 5,
        order: [['date', 'DESC'], ['created_at', 'DESC']],
        include: [
          { model: Account, as: 'fromAccount', attributes: ['id', 'name'] },
          { model: Account, as: 'toAccount', attributes: ['id', 'name'] }
        ]
      })
    ]);

    // Group expenses by category
    const expenseCategoryMap = {};
    expensesByCategory.forEach(exp => {
      if (exp.category) {
        const catId = exp.category.id;
        if (!expenseCategoryMap[catId]) {
          expenseCategoryMap[catId] = {
            id: catId,
            name: exp.category.name,
            color: exp.category.color,
            total: 0
          };
        }
        expenseCategoryMap[catId].total += parseFloat(exp.amount);
      }
    });

    // Group incomes by category
    const incomeCategoryMap = {};
    incomesByCategory.forEach(inc => {
      if (inc.category) {
        const catId = inc.category.id;
        if (!incomeCategoryMap[catId]) {
          incomeCategoryMap[catId] = {
            id: catId,
            name: inc.category.name,
            color: inc.category.color,
            total: 0
          };
        }
        incomeCategoryMap[catId].total += parseFloat(inc.amount);
      }
    });

    res.json({
      success: true,
      data: {
        accounts: {
          list: accounts,
          summary: {
            total: accounts.length,
            cash: accounts.filter(a => a.type === 'cash').length,
            bank: accounts.filter(a => a.type === 'bank').length,
            other: accounts.filter(a => a.type === 'other').length
          }
        },
        balances: {
          total: totalBalance.toFixed(2),
          by_type: {
            cash: balanceByType.cash.toFixed(2),
            bank: balanceByType.bank.toFixed(2),
            other: balanceByType.other.toFixed(2)
          }
        },
        period: {
          start_date: start_date || null,
          end_date: end_date || null,
          total_expenses: parseFloat(totalExpenses).toFixed(2),
          total_incomes: parseFloat(totalIncomes).toFixed(2),
          net_result: (parseFloat(totalIncomes) - parseFloat(totalExpenses)).toFixed(2),
          expenses_by_category: Object.values(expenseCategoryMap).map(cat => ({
            ...cat,
            total: cat.total.toFixed(2)
          })),
          incomes_by_category: Object.values(incomeCategoryMap).map(cat => ({
            ...cat,
            total: cat.total.toFixed(2)
          }))
        },
        recent_transactions: {
          expenses: recentExpenses,
          incomes: recentIncomes,
          transfers: recentTransfers
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos del dashboard',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/accounting/dashboard/monthly
 * @desc    Get monthly evolution for charts (expenses, incomes, net)
 * @access  Private (root, admin_employee)
 */
router.get('/monthly', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const dateWhere = {};
    if (start_date || end_date) {
      dateWhere.date = {};
      if (start_date) dateWhere.date[Op.gte] = start_date;
      if (end_date) dateWhere.date[Op.lte] = end_date;
    }

    const [expenses, incomes] = await Promise.all([
      Expense.findAll({
        where: dateWhere,
        attributes: ['date', 'amount'],
        order: [['date', 'ASC']]
      }),
      Income.findAll({
        where: dateWhere,
        attributes: ['date', 'amount'],
        order: [['date', 'ASC']]
      })
    ]);

    // Group by month
    const monthlyData = {};

    expenses.forEach(exp => {
      const month = exp.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { month, expenses: 0, incomes: 0 };
      }
      monthlyData[month].expenses += parseFloat(exp.amount);
    });

    incomes.forEach(inc => {
      const month = inc.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { month, expenses: 0, incomes: 0 };
      }
      monthlyData[month].incomes += parseFloat(inc.amount);
    });

    const result = Object.values(monthlyData)
      .map(m => ({
        month: m.month,
        expenses: m.expenses.toFixed(2),
        incomes: m.incomes.toFixed(2),
        net: (m.incomes - m.expenses).toFixed(2)
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching monthly data:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos mensuales',
      message: error.message
    });
  }
});

module.exports = router;
