/**
 * Liquidaciones Electrónicas Routes
 * CRUD for electronic payment settlements
 */

const express = require('express');
const router = express.Router();
const { LiquidacionElectronica, CuentaPagoElectronico, CuentaContable, Asiento } = require('../../models/accounting');
const { authorizeRoles } = require('../../middleware/auth');
const asientoService = require('../../services/asientoService');
const { Op } = require('sequelize');

// GET / - List settlements with filters
router.get('/', async (req, res) => {
  try {
    const { id_cuenta, estado, start_date, end_date, page = 1, limit = 20 } = req.query;
    const where = {};

    if (id_cuenta) where.id_cuenta = parseInt(id_cuenta);
    if (estado) where.estado = estado;
    if (start_date || end_date) {
      where.fecha_operacion = {};
      if (start_date) where.fecha_operacion[Op.gte] = start_date;
      if (end_date) where.fecha_operacion[Op.lte] = end_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await LiquidacionElectronica.findAndCountAll({
      where,
      include: [
        {
          model: CuentaPagoElectronico,
          as: 'cuentaPago',
          include: [{ model: CuentaContable, as: 'cuenta', attributes: ['id', 'codigo', 'titulo'] }]
        },
        { model: Asiento, as: 'asientoOrigen', required: false },
        { model: Asiento, as: 'asientoAcreditacion', required: false }
      ],
      order: [['fecha_operacion', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching liquidaciones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener liquidaciones' });
  }
});

// POST / - Create settlement
router.post('/', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { id_cuenta, fecha_operacion, importe_bruto, comision, referencia } = req.body;

    if (!id_cuenta || !fecha_operacion || !importe_bruto) {
      return res.status(400).json({
        success: false,
        error: 'Cuenta, fecha de operación e importe bruto son obligatorios'
      });
    }

    const cuentaPago = await CuentaPagoElectronico.findByPk(id_cuenta);
    if (!cuentaPago) {
      return res.status(404).json({ success: false, error: 'Cuenta de pago electrónico no encontrada' });
    }

    const liquidacion = await LiquidacionElectronica.create({
      id_cuenta,
      fecha_operacion,
      importe_bruto,
      comision: comision || 0,
      referencia: referencia || null,
      estado: 'pendiente'
    });

    res.status(201).json({ success: true, data: liquidacion });
  } catch (error) {
    console.error('Error creating liquidacion:', error);
    res.status(500).json({ success: false, error: 'Error al crear liquidación' });
  }
});

// POST /:id/acreditar - Mark settlement as credited and create journal entry
router.post('/:id/acreditar', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const liquidacion = await LiquidacionElectronica.findByPk(req.params.id, {
      include: [{
        model: CuentaPagoElectronico,
        as: 'cuentaPago',
        include: [{ model: CuentaContable, as: 'cuenta' }]
      }]
    });

    if (!liquidacion) {
      return res.status(404).json({ success: false, error: 'Liquidación no encontrada' });
    }

    if (liquidacion.estado !== 'pendiente') {
      return res.status(400).json({ success: false, error: 'Solo se pueden acreditar liquidaciones pendientes' });
    }

    const { id_cuenta_destino } = req.body;
    if (!id_cuenta_destino) {
      return res.status(400).json({ success: false, error: 'Se requiere la cuenta destino de acreditación' });
    }

    // Create journal entry for the credit
    const importeNeto = parseFloat(liquidacion.importe_bruto) - parseFloat(liquidacion.comision);
    const detalles = [
      { id_cuenta: id_cuenta_destino, tipo_mov: 'debe', importe: importeNeto },
      { id_cuenta: liquidacion.id_cuenta, tipo_mov: 'haber', importe: importeNeto }
    ];

    // If there's a commission, add it as a separate expense line
    if (parseFloat(liquidacion.comision) > 0) {
      // Commission would need an expense account — use the same entry
      // For now, the net amount is transferred
    }

    const result = await asientoService.createAsiento({
      fecha: new Date(),
      origen: 'liquidacion',
      concepto: `Acreditación liquidación #${liquidacion.id_liquidacion} - ${liquidacion.referencia || ''}`,
      detalles,
      usuario_id: req.user.id,
      estado: 'confirmado'
    });

    await liquidacion.update({
      estado: 'acreditada',
      fecha_acreditacion: new Date(),
      id_asiento_acreditacion: result.asiento.id_asiento
    });

    res.json({ success: true, data: liquidacion, message: 'Liquidación acreditada exitosamente' });
  } catch (error) {
    console.error('Error crediting liquidacion:', error);
    res.status(500).json({ success: false, error: 'Error al acreditar liquidación' });
  }
});

// DELETE /:id - Delete pending settlement
router.delete('/:id', authorizeRoles('root'), async (req, res) => {
  try {
    const liquidacion = await LiquidacionElectronica.findByPk(req.params.id);
    if (!liquidacion) {
      return res.status(404).json({ success: false, error: 'Liquidación no encontrada' });
    }

    if (liquidacion.estado !== 'pendiente') {
      return res.status(400).json({ success: false, error: 'Solo se pueden eliminar liquidaciones pendientes' });
    }

    await liquidacion.destroy();
    res.json({ success: true, message: 'Liquidación eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting liquidacion:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar liquidación' });
  }
});

module.exports = router;
