/**
 * Transfers Routes
 */
const express = require('express');
const router = express.Router();
const { Transfer, TransferType, Account, accountingDb } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');

// GET all transfers
router.get('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { start_date, end_date, account_id, page = 1, limit = 50 } = req.query;
    const where = {};
    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date[Op.gte] = start_date;
      if (end_date) where.date[Op.lte] = end_date;
    }
    if (account_id) {
      where[Op.or] = [{ from_account_id: account_id }, { to_account_id: account_id }];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: transfers } = await Transfer.findAndCountAll({
      where,
      include: [
        { model: Account, as: 'fromAccount', attributes: ['id', 'name', 'type'] },
        { model: Account, as: 'toAccount', attributes: ['id', 'name', 'type'] },
        { model: TransferType, as: 'transferType', required: false }
      ],
      order: [['date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const totalAmount = transfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    res.json({
      success: true,
      data: transfers,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) },
      summary: { totalAmount: totalAmount.toFixed(2), count: transfers.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener transferencias', message: error.message });
  }
});

// POST create transfer
router.post('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();
  try {
    const { amount, from_account_id, to_account_id, transfer_type_id, date, description } = req.body;
    
    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'El monto debe ser mayor a cero' });
    }
    if (!from_account_id || !to_account_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'Las cuentas de origen y destino son requeridas' });
    }
    if (from_account_id === to_account_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'Las cuentas de origen y destino deben ser diferentes' });
    }

    const [fromAccount, toAccount] = await Promise.all([
      Account.findByPk(from_account_id),
      Account.findByPk(to_account_id)
    ]);

    if (!fromAccount) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Cuenta de origen no encontrada' });
    }
    if (!toAccount) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Cuenta de destino no encontrada' });
    }

    const transfer = await Transfer.create({
      amount, from_account_id, to_account_id, transfer_type_id: transfer_type_id || null,
      date: date || new Date(), description: description || null, user_id: req.user.id
    }, { transaction });

    await fromAccount.updateBalance(amount, false, transaction);
    await toAccount.updateBalance(amount, true, transaction);
    await transaction.commit();

    const createdTransfer = await Transfer.findByPk(transfer.id, {
      include: [
        { model: Account, as: 'fromAccount' },
        { model: Account, as: 'toAccount' },
        { model: TransferType, as: 'transferType' }
      ]
    });
    res.status(201).json({ success: true, message: 'Transferencia creada exitosamente', data: createdTransfer });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: 'Error al crear transferencia', message: error.message });
  }
});

// DELETE transfer
router.delete('/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  const transaction = await accountingDb.transaction();
  try {
    const transfer = await Transfer.findByPk(req.params.id);
    if (!transfer) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Transferencia no encontrada' });
    }

    const [fromAccount, toAccount] = await Promise.all([
      Account.findByPk(transfer.from_account_id),
      Account.findByPk(transfer.to_account_id)
    ]);

    await fromAccount.updateBalance(parseFloat(transfer.amount), true, transaction);
    await toAccount.updateBalance(parseFloat(transfer.amount), false, transaction);
    await transfer.destroy({ transaction });
    await transaction.commit();

    res.json({ success: true, message: 'Transferencia eliminada exitosamente' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: 'Error al eliminar transferencia', message: error.message });
  }
});

module.exports = router;
