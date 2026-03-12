/**
 * Transfers Routes
 */
const express = require('express');
const router = express.Router();
const { Transfer, TransferType, Account, PlanDeCuentas, accountingDb } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { buildDateFilter } = require('../../utils/dateFilter');

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
  { model: Account, as: 'fromAccount', required: false, attributes: ['id', 'name', 'type'] },
  { model: Account, as: 'toAccount', required: false, attributes: ['id', 'name', 'type'] },
  { model: TransferType, as: 'transferType', required: false }
];

// GET all transfers
router.get('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { start_date, end_date, account_id, page = 1, limit = 50 } = req.query;
    const where = {};
    const dateFilter = buildDateFilter(start_date, end_date);
    if (dateFilter) where.date = dateFilter;
    if (account_id) {
      where[Op.or] = [{ from_account_id: account_id }, { to_account_id: account_id }];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: transfers } = await Transfer.findAndCountAll({
      where,
      include: planCtaInclude,
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
    const { amount, origin_plan_cta_id, destination_plan_cta_id, transfer_type_id, date, description,
            from_account_id, to_account_id } = req.body;

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'El monto debe ser mayor a cero' });
    }
    if (!origin_plan_cta_id && !from_account_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'La cuenta de origen es requerida (origin_plan_cta_id o from_account_id)' });
    }
    if (!destination_plan_cta_id && !to_account_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'La cuenta de destino es requerida (destination_plan_cta_id o to_account_id)' });
    }

    // Resolve origin/destination from old fields if new ones not provided
    let originId = origin_plan_cta_id;
    let destId = destination_plan_cta_id;

    if (!originId && from_account_id) {
      const acct = await Account.findByPk(from_account_id);
      if (acct) originId = acct.plan_cta_id;
    }
    if (!destId && to_account_id) {
      const acct = await Account.findByPk(to_account_id);
      if (acct) destId = acct.plan_cta_id;
    }

    if (originId && destId && originId === destId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'Las cuentas de origen y destino deben ser diferentes' });
    }

    // Find accounts linked to origin/destination for balance updates
    const [originAccount, destAccount] = await Promise.all([
      originId ? Account.findOne({ where: { plan_cta_id: originId } }) : null,
      destId ? Account.findOne({ where: { plan_cta_id: destId } }) : null,
    ]);

    const transfer = await Transfer.create({
      amount,
      origin_plan_cta_id: originId || null,
      destination_plan_cta_id: destId || null,
      from_account_id: originAccount?.id || from_account_id || null,
      to_account_id: destAccount?.id || to_account_id || null,
      transfer_type_id: transfer_type_id || null,
      date: date || new Date(),
      description: description || null,
      user_id: req.user.id
    }, { transaction });

    if (originAccount) await originAccount.updateBalance(parseFloat(amount), false, transaction);
    if (destAccount) await destAccount.updateBalance(parseFloat(amount), true, transaction);
    await transaction.commit();

    const createdTransfer = await Transfer.findByPk(transfer.id, {
      include: planCtaInclude
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

    // Revert balance changes (reverse of create)
    const [originAccount, destAccount] = await Promise.all([
      transfer.origin_plan_cta_id ? Account.findOne({ where: { plan_cta_id: transfer.origin_plan_cta_id } }) : (transfer.from_account_id ? Account.findByPk(transfer.from_account_id) : null),
      transfer.destination_plan_cta_id ? Account.findOne({ where: { plan_cta_id: transfer.destination_plan_cta_id } }) : (transfer.to_account_id ? Account.findByPk(transfer.to_account_id) : null),
    ]);

    if (originAccount) await originAccount.updateBalance(parseFloat(transfer.amount), true, transaction);
    if (destAccount) await destAccount.updateBalance(parseFloat(transfer.amount), false, transaction);
    await transfer.destroy({ transaction });
    await transaction.commit();

    res.json({ success: true, message: 'Transferencia eliminada exitosamente' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: 'Error al eliminar transferencia', message: error.message });
  }
});

module.exports = router;
