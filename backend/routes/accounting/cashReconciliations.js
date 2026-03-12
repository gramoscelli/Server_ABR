/**
 * Cash Reconciliations Routes
 * Uses cuenta_contable with subtipo='efectivo' instead of accounts
 */

const express = require('express');
const router = express.Router();
const { CashReconciliation, CuentaContable, CuentaEfectivo, accountingDb, Asiento, AsientoDetalle } = require('../../models/accounting');
const { authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');

// GET / - List reconciliations with filters
router.get('/', async (req, res) => {
  try {
    const { id_cuenta, start_date, end_date } = req.query;
    const where = {};

    if (id_cuenta) where.id_cuenta = parseInt(id_cuenta);
    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date[Op.gte] = start_date;
      if (end_date) where.date[Op.lte] = end_date;
    }

    const reconciliations = await CashReconciliation.findAll({
      where,
      include: [{
        model: CuentaContable,
        as: 'cuenta',
        attributes: ['id', 'codigo', 'titulo', 'subtipo'],
        include: [{
          model: CuentaEfectivo,
          as: 'efectivo',
          required: false
        }]
      }],
      order: [['date', 'DESC']]
    });

    res.json({ success: true, data: reconciliations });
  } catch (error) {
    console.error('Error fetching reconciliations:', error);
    res.status(500).json({ success: false, error: 'Error al obtener arqueos' });
  }
});

// GET /date/:date - Get reconciliation for specific date + account
router.get('/date/:date', async (req, res) => {
  try {
    const { id_cuenta } = req.query;
    const where = { date: req.params.date };
    if (id_cuenta) where.id_cuenta = parseInt(id_cuenta);

    const reconciliation = await CashReconciliation.findOne({
      where,
      include: [{
        model: CuentaContable,
        as: 'cuenta',
        attributes: ['id', 'codigo', 'titulo', 'subtipo']
      }]
    });

    if (!reconciliation) {
      return res.status(404).json({ success: false, error: 'Arqueo no encontrado para esa fecha' });
    }

    res.json({ success: true, data: reconciliation });
  } catch (error) {
    console.error('Error fetching reconciliation by date:', error);
    res.status(500).json({ success: false, error: 'Error al obtener arqueo' });
  }
});

// GET /calculate/:cuentaId/:date - Calculate expected balance for a date
router.get('/calculate/:cuentaId/:date', async (req, res) => {
  try {
    const cuentaId = parseInt(req.params.cuentaId);
    const date = req.params.date;

    const cuenta = await CuentaContable.findByPk(cuentaId);
    if (!cuenta || cuenta.subtipo !== 'efectivo') {
      return res.status(400).json({ success: false, error: 'La cuenta debe ser de tipo efectivo' });
    }

    // Get previous day's reconciliation for opening balance
    const prevReconciliation = await CashReconciliation.findOne({
      where: {
        id_cuenta: cuentaId,
        date: { [Op.lt]: date }
      },
      order: [['date', 'DESC']]
    });

    const openingBalance = prevReconciliation
      ? parseFloat(prevReconciliation.closing_balance)
      : 0;

    // Calculate movements for the day
    const dayMovements = await AsientoDetalle.findAll({
      where: { id_cuenta: cuentaId },
      include: [{
        model: Asiento,
        as: 'asiento',
        where: { estado: 'confirmado', fecha: date },
        attributes: []
      }],
      attributes: [
        'tipo_mov',
        [accountingDb.fn('SUM', accountingDb.col('importe')), 'total']
      ],
      group: ['tipo_mov'],
      raw: true
    });

    let totalDebe = 0;
    let totalHaber = 0;
    for (const m of dayMovements) {
      if (m.tipo_mov === 'debe') totalDebe = parseFloat(m.total) || 0;
      if (m.tipo_mov === 'haber') totalHaber = parseFloat(m.total) || 0;
    }

    const expectedBalance = openingBalance + totalDebe - totalHaber;

    res.json({
      success: true,
      data: {
        opening_balance: openingBalance.toFixed(2),
        total_debe: totalDebe.toFixed(2),
        total_haber: totalHaber.toFixed(2),
        expected_balance: expectedBalance.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error calculating balance:', error);
    res.status(500).json({ success: false, error: 'Error al calcular saldo esperado' });
  }
});

// POST / - Create reconciliation
router.post('/', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { id_cuenta, date, opening_balance, closing_balance, expected_balance, notes } = req.body;

    if (!id_cuenta || !date || opening_balance === undefined || closing_balance === undefined || expected_balance === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Cuenta, fecha, saldo apertura, saldo cierre y saldo esperado son obligatorios'
      });
    }

    const cuenta = await CuentaContable.findByPk(id_cuenta);
    if (!cuenta || cuenta.subtipo !== 'efectivo') {
      return res.status(400).json({ success: false, error: 'La cuenta debe ser de tipo efectivo' });
    }

    const existing = await CashReconciliation.findOne({ where: { id_cuenta, date } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Ya existe un arqueo para esta cuenta y fecha' });
    }

    const reconciliation = await CashReconciliation.create({
      id_cuenta, date, opening_balance, closing_balance, expected_balance,
      notes: notes || null, user_id: req.user.id
    });

    const result = await CashReconciliation.findByPk(reconciliation.id, {
      include: [{ model: CuentaContable, as: 'cuenta', attributes: ['id', 'codigo', 'titulo', 'subtipo'] }]
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating reconciliation:', error);
    res.status(500).json({ success: false, error: 'Error al crear arqueo' });
  }
});

// PUT /:id
router.put('/:id', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const reconciliation = await CashReconciliation.findByPk(req.params.id);
    if (!reconciliation) {
      return res.status(404).json({ success: false, error: 'Arqueo no encontrado' });
    }

    const { closing_balance, notes } = req.body;
    const updates = {};
    if (closing_balance !== undefined) updates.closing_balance = closing_balance;
    if (notes !== undefined) updates.notes = notes;

    await reconciliation.update(updates);

    const result = await CashReconciliation.findByPk(reconciliation.id, {
      include: [{ model: CuentaContable, as: 'cuenta', attributes: ['id', 'codigo', 'titulo', 'subtipo'] }]
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating reconciliation:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar arqueo' });
  }
});

// DELETE /:id
router.delete('/:id', authorizeRoles('root'), async (req, res) => {
  try {
    const reconciliation = await CashReconciliation.findByPk(req.params.id);
    if (!reconciliation) {
      return res.status(404).json({ success: false, error: 'Arqueo no encontrado' });
    }

    await reconciliation.destroy();
    res.json({ success: true, message: 'Arqueo eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting reconciliation:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar arqueo' });
  }
});

module.exports = router;
