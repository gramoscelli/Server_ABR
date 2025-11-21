/**
 * Incomes Routes - Similar structure to expenses
 */
const express = require('express');
const router = express.Router();
const { Income, IncomeCategory, Account, accountingDb } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');

// GET all incomes
router.get('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { start_date, end_date, category_id, account_id, page = 1, limit = 50 } = req.query;
    const where = {};
    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date[Op.gte] = start_date;
      if (end_date) where.date[Op.lte] = end_date;
    }
    if (category_id) where.category_id = category_id;
    if (account_id) where.account_id = account_id;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: incomes } = await Income.findAndCountAll({
      where,
      include: [
        { model: IncomeCategory, as: 'category', required: false },
        { model: Account, as: 'account', attributes: ['id', 'name', 'type'] }
      ],
      order: [['date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const totalAmount = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    res.json({
      success: true,
      data: incomes,
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
      include: [{ model: IncomeCategory, as: 'category' }, { model: Account, as: 'account' }]
    });
    if (!income) return res.status(404).json({ success: false, error: 'Ingreso no encontrado' });
    res.json({ success: true, data: income });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener ingreso', message: error.message });
  }
});

// POST create income
router.post('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();
  try {
    const { amount, category_id, account_id, date, description, attachment_url } = req.body;
    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'El monto debe ser mayor a cero' });
    }
    if (!account_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'La cuenta es requerida' });
    }

    const account = await Account.findByPk(account_id);
    if (!account) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Cuenta no encontrada' });
    }

    const income = await Income.create({
      amount, category_id: category_id || null, account_id, date: date || new Date(),
      description: description || null, attachment_url: attachment_url || null, user_id: req.user.id
    }, { transaction });

    await account.updateBalance(parseFloat(amount), true, transaction);
    await transaction.commit();

    const createdIncome = await Income.findByPk(income.id, {
      include: [{ model: IncomeCategory, as: 'category' }, { model: Account, as: 'account' }]
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

    const { amount, category_id, account_id, date, description, attachment_url } = req.body;
    
    if (amount !== undefined || account_id !== undefined) {
      const oldAccount = await Account.findByPk(income.account_id);
      const oldAmount = parseFloat(income.amount);
      await oldAccount.updateBalance(oldAmount, false, transaction);

      const newAccountId = account_id || income.account_id;
      const newAmount = amount !== undefined ? parseFloat(amount) : oldAmount;
      const newAccount = await Account.findByPk(newAccountId);
      await newAccount.updateBalance(newAmount, true, transaction);
    }

    if (amount !== undefined) income.amount = amount;
    if (category_id !== undefined) income.category_id = category_id;
    if (account_id !== undefined) income.account_id = account_id;
    if (date !== undefined) income.date = date;
    if (description !== undefined) income.description = description;
    if (attachment_url !== undefined) income.attachment_url = attachment_url;

    await income.save({ transaction });
    await transaction.commit();

    const updatedIncome = await Income.findByPk(income.id, {
      include: [{ model: IncomeCategory, as: 'category' }, { model: Account, as: 'account' }]
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

    const account = await Account.findByPk(income.account_id);
    await account.updateBalance(parseFloat(income.amount), false, transaction);
    await income.destroy({ transaction });
    await transaction.commit();

    res.json({ success: true, message: 'Ingreso eliminado exitosamente' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: 'Error al eliminar ingreso', message: error.message });
  }
});

module.exports = router;
