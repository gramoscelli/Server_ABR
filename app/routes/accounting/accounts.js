/**
 * Accounts Routes
 * CRUD operations for financial accounts (cash, bank accounts)
 */

const express = require('express');
const router = express.Router();
const { Account, Expense, Income, Transfer } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');

/**
 * @route   GET /api/accounting/accounts
 * @desc    Get all accounts with balances
 * @access  Private (root, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { type, is_active } = req.query;

    const where = {};
    if (type) where.type = type;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const accounts = await Account.findAll({
      where,
      order: [
        ['type', 'ASC'],
        ['name', 'ASC']
      ]
    });

    // Calculate total balance
    const totalBalance = accounts.reduce((sum, acc) =>
      sum + parseFloat(acc.current_balance), 0
    );

    res.json({
      success: true,
      data: accounts,
      summary: {
        total: accounts.length,
        totalBalance: totalBalance.toFixed(2),
        byType: {
          cash: accounts.filter(a => a.type === 'cash').length,
          bank: accounts.filter(a => a.type === 'bank').length,
          other: accounts.filter(a => a.type === 'other').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cuentas',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/accounting/accounts/:id
 * @desc    Get single account with transaction history
 * @access  Private (root, admin_employee)
 */
router.get('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const account = await Account.findByPk(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Cuenta no encontrada'
      });
    }

    // Get recent transactions
    const [expenses, incomes, outgoingTransfers, incomingTransfers] = await Promise.all([
      Expense.findAll({
        where: { account_id: req.params.id },
        limit: 10,
        order: [['date', 'DESC']]
      }),
      Income.findAll({
        where: { account_id: req.params.id },
        limit: 10,
        order: [['date', 'DESC']]
      }),
      Transfer.findAll({
        where: { from_account_id: req.params.id },
        limit: 10,
        order: [['date', 'DESC']]
      }),
      Transfer.findAll({
        where: { to_account_id: req.params.id },
        limit: 10,
        order: [['date', 'DESC']]
      })
    ]);

    res.json({
      success: true,
      data: {
        account,
        recentTransactions: {
          expenses,
          incomes,
          outgoingTransfers,
          incomingTransfers
        }
      }
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cuenta',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/accounting/accounts
 * @desc    Create new account
 * @access  Private (root, admin_employee)
 */
router.post('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { name, type, account_number, bank_name, currency, initial_balance, notes } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
    }

    if (type && !['cash', 'bank', 'other'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo inválido. Debe ser: cash, bank o other'
      });
    }

    const account = await Account.create({
      name,
      type: type || 'bank',
      account_number: account_number || null,
      bank_name: bank_name || null,
      currency: currency || 'ARS',
      initial_balance: initial_balance || 0,
      current_balance: initial_balance || 0,
      is_active: true,
      notes: notes || null
    });

    res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente',
      data: account
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear cuenta',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/accounting/accounts/:id
 * @desc    Update account
 * @access  Private (root, admin_employee)
 */
router.put('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const account = await Account.findByPk(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Cuenta no encontrada'
      });
    }

    const { name, type, account_number, bank_name, currency, is_active, notes } = req.body;

    if (type && !['cash', 'bank', 'other'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo inválido. Debe ser: cash, bank o other'
      });
    }

    if (name !== undefined) account.name = name;
    if (type !== undefined) account.type = type;
    if (account_number !== undefined) account.account_number = account_number;
    if (bank_name !== undefined) account.bank_name = bank_name;
    if (currency !== undefined) account.currency = currency;
    if (is_active !== undefined) account.is_active = is_active;
    if (notes !== undefined) account.notes = notes;

    await account.save();

    res.json({
      success: true,
      message: 'Cuenta actualizada exitosamente',
      data: account
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar cuenta',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/accounting/accounts/:id/balance
 * @desc    Adjust account balance (manual adjustment)
 * @access  Private (root)
 */
router.put('/:id/balance', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const account = await Account.findByPk(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Cuenta no encontrada'
      });
    }

    const { new_balance, notes } = req.body;

    if (new_balance === undefined) {
      return res.status(400).json({
        success: false,
        error: 'El nuevo balance es requerido'
      });
    }

    const oldBalance = account.current_balance;
    account.current_balance = new_balance;
    if (notes) account.notes = notes;

    await account.save();

    res.json({
      success: true,
      message: 'Balance ajustado exitosamente',
      data: {
        account,
        old_balance: oldBalance,
        new_balance: new_balance,
        difference: parseFloat(new_balance) - parseFloat(oldBalance)
      }
    });
  } catch (error) {
    console.error('Error adjusting balance:', error);
    res.status(500).json({
      success: false,
      error: 'Error al ajustar balance',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/accounting/accounts/:id
 * @desc    Delete account (only if no transactions)
 * @access  Private (root)
 */
router.delete('/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const account = await Account.findByPk(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Cuenta no encontrada'
      });
    }

    // Check for existing transactions
    const [expenseCount, incomeCount, transferCount] = await Promise.all([
      Expense.count({ where: { account_id: req.params.id } }),
      Income.count({ where: { account_id: req.params.id } }),
      Transfer.count({
        where: {
          [Op.or]: [
            { from_account_id: req.params.id },
            { to_account_id: req.params.id }
          ]
        }
      })
    ]);

    const totalTransactions = expenseCount + incomeCount + transferCount;

    if (totalTransactions > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una cuenta con transacciones asociadas',
        details: {
          expenses: expenseCount,
          incomes: incomeCount,
          transfers: transferCount
        }
      });
    }

    await account.destroy();

    res.json({
      success: true,
      message: 'Cuenta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar cuenta',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/accounting/accounts/:id/balance-history
 * @desc    Get account balance history
 * @access  Private (root, admin_employee)
 */
router.get('/:id/balance-history', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const account = await Account.findByPk(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Cuenta no encontrada'
      });
    }

    const where = { account_id: req.params.id };
    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date[Op.gte] = start_date;
      if (end_date) where.date[Op.lte] = end_date;
    }

    const [expenses, incomes, outgoingTransfers, incomingTransfers] = await Promise.all([
      Expense.findAll({ where, order: [['date', 'ASC']] }),
      Income.findAll({ where, order: [['date', 'ASC']] }),
      Transfer.findAll({
        where: { ...where, from_account_id: req.params.id },
        order: [['date', 'ASC']]
      }),
      Transfer.findAll({
        where: { ...where, to_account_id: req.params.id },
        order: [['date', 'ASC']]
      })
    ]);

    // Combine and sort all transactions
    const allTransactions = [
      ...expenses.map(t => ({ ...t.toJSON(), type: 'expense', amount: -parseFloat(t.amount) })),
      ...incomes.map(t => ({ ...t.toJSON(), type: 'income', amount: parseFloat(t.amount) })),
      ...outgoingTransfers.map(t => ({ ...t.toJSON(), type: 'transfer_out', amount: -parseFloat(t.amount) })),
      ...incomingTransfers.map(t => ({ ...t.toJSON(), type: 'transfer_in', amount: parseFloat(t.amount) }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let runningBalance = parseFloat(account.initial_balance);
    const history = allTransactions.map(t => {
      runningBalance += t.amount;
      return {
        ...t,
        balance: runningBalance.toFixed(2)
      };
    });

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          name: account.name,
          initial_balance: account.initial_balance,
          current_balance: account.current_balance
        },
        history
      }
    });
  } catch (error) {
    console.error('Error fetching balance history:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial de balance',
      message: error.message
    });
  }
});

module.exports = router;
