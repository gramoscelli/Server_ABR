/**
 * Reports Routes
 * Financial statements and accounting reports
 */

const express = require('express');
const router = express.Router();
const { Income, Expense, PlanDeCuentas, accountingDb } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');

/**
 * @route   GET /api/accounting/reports/estado-resultados
 * @desc    Get income statement (Estado de Resultados) for a period
 * @access  Private (root, admin_employee)
 *
 * Returns:
 * - Ingresos grouped by plan_cta_id with codes and names
 * - Egresos grouped by plan_cta_id with codes and names
 * - Net result (Ingresos - Egresos)
 */
router.get('/estado-resultados', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Build date filter
    const dateWhere = {};
    if (start_date || end_date) {
      dateWhere.date = {};
      if (start_date) dateWhere.date[Op.gte] = start_date;
      if (end_date) dateWhere.date[Op.lte] = end_date;
    }

    // Fetch incomes with plan_cta details
    const incomes = await Income.findAll({
      where: dateWhere,
      include: [{
        model: PlanDeCuentas,
        as: 'planCta',
        required: false,
        attributes: ['id', 'codigo', 'nombre', 'tipo', 'grupo']
      }],
      attributes: ['id', 'amount', 'plan_cta_id', 'date']
    });

    // Fetch expenses with plan_cta details
    const expenses = await Expense.findAll({
      where: dateWhere,
      include: [{
        model: PlanDeCuentas,
        as: 'planCta',
        required: false,
        attributes: ['id', 'codigo', 'nombre', 'tipo', 'grupo']
      }],
      attributes: ['id', 'amount', 'plan_cta_id', 'date']
    });

    // Group incomes by plan_cta_id
    const incomesGrouped = {};
    let totalIncomes = 0;

    incomes.forEach(inc => {
      const key = inc.plan_cta_id || 'sin_categoria';
      const amount = parseFloat(inc.amount);
      totalIncomes += amount;

      if (!incomesGrouped[key]) {
        incomesGrouped[key] = {
          plan_cta_id: inc.plan_cta_id,
          codigo: inc.planCta?.codigo || null,
          nombre: inc.planCta?.nombre || 'Sin clasificar',
          total: 0,
          count: 0
        };
      }
      incomesGrouped[key].total += amount;
      incomesGrouped[key].count += 1;
    });

    // Group expenses by plan_cta_id
    const expensesGrouped = {};
    let totalExpenses = 0;

    expenses.forEach(exp => {
      const key = exp.plan_cta_id || 'sin_categoria';
      const amount = parseFloat(exp.amount);
      totalExpenses += amount;

      if (!expensesGrouped[key]) {
        expensesGrouped[key] = {
          plan_cta_id: exp.plan_cta_id,
          codigo: exp.planCta?.codigo || null,
          nombre: exp.planCta?.nombre || 'Sin clasificar',
          total: 0,
          count: 0
        };
      }
      expensesGrouped[key].total += amount;
      expensesGrouped[key].count += 1;
    });

    // Calculate net result
    const netResult = totalIncomes - totalExpenses;

    // Format response
    const response = {
      success: true,
      period: {
        start_date: start_date || null,
        end_date: end_date || null
      },
      ingresos: {
        items: Object.values(incomesGrouped)
          .map(item => ({
            ...item,
            total: item.total.toFixed(2)
          }))
          .sort((a, b) => (b.codigo || 0) - (a.codigo || 0)),
        total: totalIncomes.toFixed(2),
        count: incomes.length
      },
      egresos: {
        items: Object.values(expensesGrouped)
          .map(item => ({
            ...item,
            total: item.total.toFixed(2)
          }))
          .sort((a, b) => (b.codigo || 0) - (a.codigo || 0)),
        total: totalExpenses.toFixed(2),
        count: expenses.length
      },
      resultado: {
        ingresos: totalIncomes.toFixed(2),
        egresos: totalExpenses.toFixed(2),
        neto: netResult.toFixed(2)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating estado de resultados:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar estado de resultados',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/accounting/reports/balance-general
 * @desc    Get balance sheet (Balance General) - summary of accounts by type
 * @access  Private (root, admin_employee)
 */
router.get('/balance-general', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { Account } = require('../../models/accounting');

    const accounts = await Account.findAll({
      include: [{
        model: PlanDeCuentas,
        as: 'planCta',
        required: false,
        attributes: ['id', 'codigo', 'nombre', 'tipo', 'grupo']
      }],
      order: [['type', 'ASC'], ['name', 'ASC']]
    });

    // Group by account type
    const byType = {
      cash: [],
      bank: [],
      other: []
    };

    let totalCash = 0;
    let totalBank = 0;
    let totalOther = 0;

    accounts.forEach(acc => {
      const balance = parseFloat(acc.current_balance);
      const account = {
        id: acc.id,
        name: acc.name,
        plan_cta_id: acc.plan_cta_id,
        codigo: acc.planCta?.codigo || null,
        balance: balance.toFixed(2)
      };

      if (acc.type === 'cash') {
        byType.cash.push(account);
        totalCash += balance;
      } else if (acc.type === 'bank') {
        byType.bank.push(account);
        totalBank += balance;
      } else {
        byType.other.push(account);
        totalOther += balance;
      }
    });

    res.json({
      success: true,
      data: {
        activo: {
          caja: {
            items: byType.cash,
            total: totalCash.toFixed(2)
          },
          bancos: {
            items: byType.bank,
            total: totalBank.toFixed(2)
          },
          otros: {
            items: byType.other,
            total: totalOther.toFixed(2)
          },
          total: (totalCash + totalBank + totalOther).toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Error generating balance general:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar balance general',
      message: error.message
    });
  }
});

module.exports = router;
