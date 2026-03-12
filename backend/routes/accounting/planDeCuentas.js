/**
 * Plan de Cuentas Routes
 * Endpoints for managing the chart of accounts (Plan de Cuentas)
 */

const express = require('express');
const router = express.Router();
const { PlanDeCuentas, Account, Expense, Income } = require('../../models/accounting');
const { authorizeRoles } = require('../../middleware/auth');

/**
 * GET /api/accounting/plan-de-cuentas
 * Get all accounts from the chart of accounts
 * Query params:
 *   - tipo: 'activo'|'pasivo'|'ingreso'|'egreso' (optional filter)
 */
router.get('/', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { tipo } = req.query;
    const where = {};

    if (tipo) {
      where.tipo = tipo;
    }

    const cuentas = await PlanDeCuentas.findAll({
      where,
      include: [{
        model: Account,
        as: 'accounts',
        required: false,
        attributes: ['id', 'name', 'type', 'current_balance', 'currency']
      }],
      order: [['codigo', 'ASC']],
      attributes: ['id', 'codigo', 'nombre', 'tipo', 'grupo', 'is_active', 'created_at', 'updated_at']
    });

    res.json({
      success: true,
      data: cuentas,
      count: cuentas.length
    });
  } catch (error) {
    console.error('Error fetching plan de cuentas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el plan de cuentas',
      error: error.message
    });
  }
});

/**
 * GET /api/accounting/plan-de-cuentas/:id
 * Get a single account by ID
 */
router.get('/:id', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { id } = req.params;

    const cuenta = await PlanDeCuentas.findByPk(id);

    if (!cuenta) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta no encontrada'
      });
    }

    res.json({
      success: true,
      data: cuenta
    });
  } catch (error) {
    console.error('Error fetching plan de cuentas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la cuenta',
      error: error.message
    });
  }
});

/**
 * GET /api/accounting/plan-de-cuentas/by-codigo/:codigo
 * Get account by code (convenience endpoint)
 */
router.get('/by-codigo/:codigo', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { codigo } = req.params;

    const cuenta = await PlanDeCuentas.findOne({
      where: { codigo: parseInt(codigo) }
    });

    if (!cuenta) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta no encontrada'
      });
    }

    res.json({
      success: true,
      data: cuenta
    });
  } catch (error) {
    console.error('Error fetching plan de cuentas by codigo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la cuenta',
      error: error.message
    });
  }
});

/**
 * POST /api/accounting/plan-de-cuentas
 * Create a new account in the chart of accounts
 * Body: { codigo, nombre }
 * tipo and grupo are derived from codigo (defense in depth)
 */
router.post('/', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { codigo, nombre } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Los campos codigo y nombre son requeridos'
      });
    }

    const tipoMap = { '1': 'activo', '2': 'pasivo', '4': 'ingreso', '5': 'egreso' };
    const firstDigit = String(codigo).charAt(0);
    const tipo = tipoMap[firstDigit];

    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: 'Código inválido: debe empezar con 1 (activo), 2 (pasivo), 4 (ingreso) o 5 (egreso)'
      });
    }

    const grupo = String(codigo).substring(0, 2);

    // Check if codigo already exists
    const existing = await PlanDeCuentas.findOne({ where: { codigo } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Ya existe una cuenta con el código ${codigo}`
      });
    }

    const cuenta = await PlanDeCuentas.create({
      codigo,
      nombre,
      tipo,
      grupo,
      is_active: true
    });

    res.status(201).json({
      success: true,
      data: cuenta,
      message: 'Cuenta creada correctamente'
    });
  } catch (error) {
    console.error('Error creating plan de cuentas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la cuenta',
      error: error.message
    });
  }
});

/**
 * PUT /api/accounting/plan-de-cuentas/:id
 * Update account
 * Body: { nombre?, is_active? }
 * Note: codigo is immutable (set by accounting regulations)
 */
router.put('/:id', authorizeRoles('root'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, is_active } = req.body;

    const cuenta = await PlanDeCuentas.findByPk(id);

    if (!cuenta) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta no encontrada'
      });
    }

    // If deactivating, check if linked to an active account
    if (is_active === false && cuenta.is_active === true) {
      const linkedAccount = await Account.findOne({ where: { plan_cta_id: id } });
      if (linkedAccount && linkedAccount.is_active) {
        return res.status(400).json({
          success: false,
          message: `No se puede desactivar: está vinculada a la cuenta "${linkedAccount.name}" que está activa`
        });
      }
    }

    if (nombre) {
      cuenta.nombre = nombre;
    }

    if (typeof is_active === 'boolean') {
      cuenta.is_active = is_active;
    }

    await cuenta.save();

    res.json({
      success: true,
      data: cuenta,
      message: 'Cuenta actualizada correctamente'
    });
  } catch (error) {
    console.error('Error updating plan de cuentas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la cuenta',
      error: error.message
    });
  }
});

/**
 * DELETE /api/accounting/plan-de-cuentas/:id
 * Delete an account from the chart of accounts
 * Blocked if the account has associated expenses, incomes, or accounts
 */
router.delete('/:id', authorizeRoles('root'), async (req, res) => {
  try {
    const { id } = req.params;

    const cuenta = await PlanDeCuentas.findByPk(id);

    if (!cuenta) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta no encontrada'
      });
    }

    // Check for associated records
    const [expenseCount, incomeCount, linkedAccount] = await Promise.all([
      Expense.count({ where: { plan_cta_id: id } }),
      Income.count({ where: { plan_cta_id: id } }),
      Account.findOne({ where: { plan_cta_id: id } })
    ]);

    const reasons = [];
    if (expenseCount > 0) reasons.push(`${expenseCount} egreso(s)`);
    if (incomeCount > 0) reasons.push(`${incomeCount} ingreso(s)`);
    if (linkedAccount) reasons.push(`cuenta "${linkedAccount.name}"`);

    if (reasons.length > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar: tiene asociado(s) ${reasons.join(', ')}`,
        details: {
          expenses: expenseCount,
          incomes: incomeCount,
          linked_account: linkedAccount ? linkedAccount.name : null
        }
      });
    }

    await cuenta.destroy();

    res.json({
      success: true,
      message: 'Cuenta eliminada correctamente'
    });
  } catch (error) {
    console.error('Error deleting plan de cuentas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la cuenta',
      error: error.message
    });
  }
});

module.exports = router;
