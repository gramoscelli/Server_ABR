/**
 * Plan de Cuentas Routes
 * Endpoints for managing the chart of accounts (Plan de Cuentas)
 */

const express = require('express');
const router = express.Router();
const { PlanDeCuentas } = require('../../models/accounting');

/**
 * GET /api/accounting/plan-de-cuentas
 * Get all accounts from the chart of accounts
 * Query params:
 *   - tipo: 'activo'|'pasivo'|'ingreso'|'egreso' (optional filter)
 */
router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;
    const where = {};

    if (tipo) {
      where.tipo = tipo;
    }

    const cuentas = await PlanDeCuentas.findAll({
      where,
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
router.get('/:id', async (req, res) => {
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
router.get('/by-codigo/:codigo', async (req, res) => {
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
 * PUT /api/accounting/plan-de-cuentas/:id
 * Update account (root only)
 * Body: { nombre?, is_active? }
 * Note: codigo is immutable (set by accounting regulations)
 */
router.put('/:id', async (req, res) => {
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

    // Only root can update (enforced by middleware in app.js)
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

module.exports = router;
