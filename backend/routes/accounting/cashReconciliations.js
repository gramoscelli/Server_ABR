/**
 * Cash Reconciliations Routes (Arqueos de Caja)
 */
const express = require('express');
const router = express.Router();
const { CashReconciliation, Account, Expense, Income, Transfer } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');

// GET all reconciliations
router.get('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { account_id, start_date, end_date } = req.query;
    const where = {};
    if (account_id) where.account_id = account_id;
    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date[Op.gte] = start_date;
      if (end_date) where.date[Op.lte] = end_date;
    }

    const reconciliations = await CashReconciliation.findAll({
      where,
      include: [{ model: Account, as: 'account' }],
      order: [['date', 'DESC']]
    });

    res.json({ success: true, data: reconciliations });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener arqueos', message: error.message });
  }
});

// GET reconciliation for specific date
router.get('/date/:date', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { account_id } = req.query;
    if (!account_id) {
      return res.status(400).json({ success: false, error: 'account_id es requerido' });
    }

    const reconciliation = await CashReconciliation.findOne({
      where: { account_id, date: req.params.date },
      include: [{ model: Account, as: 'account' }]
    });

    if (!reconciliation) {
      return res.status(404).json({ success: false, error: 'Arqueo no encontrado' });
    }

    res.json({ success: true, data: reconciliation });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener arqueo', message: error.message });
  }
});

// POST create reconciliation
router.post('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { account_id, date, opening_balance, closing_balance, expected_balance, notes } = req.body;

    if (!account_id || !date || opening_balance === undefined || closing_balance === undefined || expected_balance === undefined) {
      return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
    }

    const account = await Account.findByPk(account_id);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Cuenta no encontrada' });
    }

    // Check if reconciliation already exists for this date
    const existing = await CashReconciliation.findOne({ where: { account_id, date } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Ya existe un arqueo para esta fecha' });
    }

    const reconciliation = await CashReconciliation.create({
      account_id, date, opening_balance, closing_balance, expected_balance,
      notes: notes || null, user_id: req.user.id
    });

    const created = await CashReconciliation.findByPk(reconciliation.id, {
      include: [{ model: Account, as: 'account' }]
    });

    res.status(201).json({ success: true, message: 'Arqueo creado exitosamente', data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al crear arqueo', message: error.message });
  }
});

// PUT update reconciliation
router.put('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const reconciliation = await CashReconciliation.findByPk(req.params.id);
    if (!reconciliation) {
      return res.status(404).json({ success: false, error: 'Arqueo no encontrado' });
    }

    const { closing_balance, notes } = req.body;
    if (closing_balance !== undefined) reconciliation.closing_balance = closing_balance;
    if (notes !== undefined) reconciliation.notes = notes;

    await reconciliation.save();

    const updated = await CashReconciliation.findByPk(reconciliation.id, {
      include: [{ model: Account, as: 'account' }]
    });

    res.json({ success: true, message: 'Arqueo actualizado exitosamente', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar arqueo', message: error.message });
  }
});

// DELETE reconciliation
router.delete('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const reconciliation = await CashReconciliation.findByPk(req.params.id);
    if (!reconciliation) {
      return res.status(404).json({ success: false, error: 'Arqueo no encontrado' });
    }

    await reconciliation.destroy();
    res.json({ success: true, message: 'Arqueo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar arqueo', message: error.message });
  }
});

// GET calculate expected balance for date
router.get('/calculate/:account_id/:date', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { account_id, date } = req.params;
    
    const account = await Account.findByPk(account_id);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Cuenta no encontrada' });
    }

    // Get previous reconciliation
    const prevReconciliation = await CashReconciliation.findOne({
      where: { account_id, date: { [Op.lt]: date } },
      order: [['date', 'DESC']]
    });

    const openingBalance = prevReconciliation ? parseFloat(prevReconciliation.closing_balance) : parseFloat(account.initial_balance);

    // Calculate transactions for the day
    const [incomes, expenses, incomingTransfers, outgoingTransfers] = await Promise.all([
      Income.sum('amount', { where: { account_id, date } }) || 0,
      Expense.sum('amount', { where: { account_id, date } }) || 0,
      Transfer.sum('amount', { where: { to_account_id: account_id, date } }) || 0,
      Transfer.sum('amount', { where: { from_account_id: account_id, date } }) || 0
    ]);

    const expectedBalance = openingBalance + incomes - expenses + incomingTransfers - outgoingTransfers;

    res.json({
      success: true,
      data: {
        opening_balance: openingBalance.toFixed(2),
        incomes: incomes.toFixed(2),
        expenses: expenses.toFixed(2),
        incoming_transfers: incomingTransfers.toFixed(2),
        outgoing_transfers: outgoingTransfers.toFixed(2),
        expected_balance: expectedBalance.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al calcular balance', message: error.message });
  }
});

module.exports = router;
