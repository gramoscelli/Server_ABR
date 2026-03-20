/**
 * Asientos Routes (replaces expenses.js + incomes.js + transfers.js)
 * Journal entry CRUD with double-entry validation
 */

const express = require('express');
const router = express.Router();
const { Asiento, AsientoDetalle, CuentaContable, AsientoAudit } = require('../../models/accounting');
const { authorizeRoles } = require('../../middleware/auth');
const asientoService = require('../../services/asientoService');
const { Op } = require('sequelize');
const User = require('../../models/User');

// Attach user info to asiento(s) - resolves usuario_id, confirmado_por, anulado_por, eliminado_por
async function attachUsuarios(asientos) {
  const list = Array.isArray(asientos) ? asientos : [asientos];
  const userIds = [...new Set(
    list.flatMap(a => {
      const plain = a.toJSON ? a.toJSON() : a;
      return [plain.usuario_id, plain.confirmado_por, plain.anulado_por, plain.eliminado_por].filter(Boolean);
    })
  )];
  if (userIds.length === 0) return;
  const users = await User.findAll({
    where: { id: userIds },
    attributes: ['id', 'username', 'nombre', 'apellido'],
    raw: true
  });
  const userMap = {};
  for (const u of users) userMap[u.id] = u;
  for (const a of list) {
    const plain = a.toJSON ? a.toJSON() : a;
    const setField = (field, value) => {
      if (a.dataValues) {
        a.dataValues[field] = value;
      } else {
        a[field] = value;
      }
    };
    if (plain.usuario_id && userMap[plain.usuario_id]) {
      setField('usuario', userMap[plain.usuario_id]);
    }
    if (plain.confirmado_por && userMap[plain.confirmado_por]) {
      setField('confirmado_por_usuario', userMap[plain.confirmado_por]);
    }
    if (plain.anulado_por && userMap[plain.anulado_por]) {
      setField('anulado_por_usuario', userMap[plain.anulado_por]);
    }
    if (plain.eliminado_por && userMap[plain.eliminado_por]) {
      setField('eliminado_por_usuario', userMap[plain.eliminado_por]);
    }
  }
}

// GET / - List journal entries with filters
router.get('/', async (req, res) => {
  try {
    const {
      start_date, end_date, estado, origen, cuenta_id,
      subdiario, include_subdiario,
      page = 1, limit = 20
    } = req.query;

    const where = {};

    if (start_date || end_date) {
      where.fecha = {};
      if (start_date) where.fecha[Op.gte] = start_date;
      if (end_date) where.fecha[Op.lte] = end_date;
    }
    if (estado) where.estado = estado;
    if (origen) {
      // Support comma-separated values: origen=ingreso,egreso,transferencia
      const origenValues = origen.split(',').map(v => v.trim()).filter(Boolean);
      where.origen = origenValues.length === 1 ? origenValues[0] : { [Op.in]: origenValues };
    }

    // Subdiario filtering:
    // - subdiario=caja → only subdiario de caja entries
    // - include_subdiario=true → include all (no filter)
    // - default → exclude subdiario entries (libro diario only)
    if (subdiario) {
      where.subdiario = subdiario;
    } else if (include_subdiario !== 'true') {
      where.subdiario = null;
    }

    // If filtering by account, we need to join through detalles
    const includeDetalles = {
      model: AsientoDetalle,
      as: 'detalles',
      include: [{
        model: CuentaContable,
        as: 'cuenta',
        attributes: ['id', 'codigo', 'titulo', 'tipo', 'subtipo']
      }]
    };

    if (cuenta_id) {
      includeDetalles.where = { id_cuenta: parseInt(cuenta_id) };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Asiento.findAndCountAll({
      where,
      include: [
        includeDetalles,
        {
          model: Asiento,
          as: 'asientoAnulado',
          attributes: ['id_asiento', 'nro_comprobante', 'fecha', 'concepto'],
          required: false
        }
      ],
      order: [['fecha', 'DESC'], ['id_asiento', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    // Calculate totals for the period
    const totalQuery = await AsientoDetalle.findAll({
      attributes: [
        'tipo_mov',
        [AsientoDetalle.sequelize.fn('SUM', AsientoDetalle.sequelize.col('AsientoDetalle.importe')), 'total']
      ],
      include: [{
        model: Asiento,
        as: 'asiento',
        where: { ...where, estado: 'confirmado' },
        attributes: []
      }],
      group: ['tipo_mov'],
      raw: true
    });

    let totalDebe = 0;
    let totalHaber = 0;
    for (const t of totalQuery) {
      if (t.tipo_mov === 'debe') totalDebe = parseFloat(t.total) || 0;
      if (t.tipo_mov === 'haber') totalHaber = parseFloat(t.total) || 0;
    }

    // When filtering by cuenta_id, the include.where only returns matching detalles.
    // Re-fetch all detalles for the found asientos so the full entry is visible.
    if (cuenta_id && rows.length > 0) {
      const asientoIds = rows.map(a => a.id_asiento);
      const allDetalles = await AsientoDetalle.findAll({
        where: { id_asiento: { [Op.in]: asientoIds } },
        include: [{
          model: CuentaContable,
          as: 'cuenta',
          attributes: ['id', 'codigo', 'titulo', 'tipo', 'subtipo']
        }]
      });
      const detalleMap = {};
      for (const d of allDetalles) {
        if (!detalleMap[d.id_asiento]) detalleMap[d.id_asiento] = [];
        detalleMap[d.id_asiento].push(d);
      }
      for (const a of rows) {
        a.dataValues.detalles = detalleMap[a.id_asiento] || [];
      }
    }

    await attachUsuarios(rows);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      },
      summary: {
        totalDebe: totalDebe.toFixed(2),
        totalHaber: totalHaber.toFixed(2),
        count
      }
    });
  } catch (error) {
    console.error('Error fetching asientos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asientos' });
  }
});

// GET /:id - Get single journal entry with all detail lines
router.get('/:id', async (req, res) => {
  try {
    // Use regex to avoid matching "/:id/audit"
    if (req.params.id === 'audit') return;

    const asiento = await Asiento.findByPk(req.params.id, {
      include: [{
        model: AsientoDetalle,
        as: 'detalles',
        include: [{
          model: CuentaContable,
          as: 'cuenta',
          attributes: ['id', 'codigo', 'titulo', 'tipo', 'subtipo', 'grupo']
        }]
      }]
    });

    if (!asiento) {
      return res.status(404).json({ success: false, error: 'Asiento no encontrado' });
    }

    await attachUsuarios(asiento);
    res.json({ success: true, data: asiento });
  } catch (error) {
    console.error('Error fetching asiento:', error);
    res.status(500).json({ success: false, error: 'Error al obtener asiento' });
  }
});

// GET /:id/audit - Get audit history for a journal entry
router.get('/:id/audit', async (req, res) => {
  try {
    const asiento = await Asiento.unscoped().findByPk(req.params.id, {
      attributes: ['id_asiento', 'nro_comprobante']
    });

    if (!asiento) {
      return res.status(404).json({ success: false, error: 'Asiento no encontrado' });
    }

    const auditLog = await AsientoAudit.findAll({
      where: { id_asiento: req.params.id },
      order: [['timestamp', 'ASC'], ['id_audit', 'ASC']]
    });

    // Resolve user names
    const userIds = [...new Set(auditLog.map(a => a.usuario_id).filter(Boolean))];
    let userMap = {};
    if (userIds.length > 0) {
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username', 'nombre', 'apellido'],
        raw: true
      });
      for (const u of users) userMap[u.id] = u;
    }

    const data = auditLog.map(entry => ({
      ...entry.toJSON(),
      usuario: userMap[entry.usuario_id] || null
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ success: false, error: 'Error al obtener historial de auditoría' });
  }
});

// POST / - Create journal entry with balance validation
router.post('/', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { fecha, origen, concepto, detalles, estado, subdiario } = req.body;

    if (!fecha || !concepto || !detalles || !Array.isArray(detalles)) {
      return res.status(400).json({
        success: false,
        error: 'Fecha, concepto y detalles son obligatorios'
      });
    }

    const result = await asientoService.createAsiento({
      fecha,
      origen,
      concepto,
      detalles,
      usuario_id: req.user.id,
      estado,
      subdiario: subdiario || null
    });

    // Re-fetch with full associations
    const asiento = await Asiento.findByPk(result.asiento.id_asiento, {
      include: [{
        model: AsientoDetalle,
        as: 'detalles',
        include: [{
          model: CuentaContable,
          as: 'cuenta',
          attributes: ['id', 'codigo', 'titulo', 'tipo', 'subtipo']
        }]
      }]
    });

    res.status(201).json({ success: true, data: asiento });
  } catch (error) {
    console.error('Error creating asiento:', error);
    if (error.message.includes('no balancea') || error.message.includes('inválido') ||
        error.message.includes('no encontrad') || error.message.includes('inactiv') ||
        error.message.includes('al menos 2')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Error al crear asiento' });
  }
});

// PUT /:id - Update draft journal entry only
router.put('/:id', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const asiento = await Asiento.findByPk(req.params.id);
    if (!asiento) {
      return res.status(404).json({ success: false, error: 'Asiento no encontrado' });
    }

    if (asiento.estado !== 'borrador') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden editar asientos en estado borrador'
      });
    }

    const { fecha, origen, concepto, detalles } = req.body;

    // Capture previous values for audit
    const valoresPrevios = {};
    if (fecha && fecha !== asiento.fecha) valoresPrevios.fecha = asiento.fecha;
    if (origen && origen !== asiento.origen) valoresPrevios.origen = asiento.origen;
    if (concepto && concepto !== asiento.concepto) valoresPrevios.concepto = asiento.concepto;

    // Update header
    const updates = {};
    if (fecha) updates.fecha = fecha;
    if (origen) updates.origen = origen;
    if (concepto) updates.concepto = concepto;

    // If detalles provided, replace all lines
    if (detalles && Array.isArray(detalles) && detalles.length >= 2) {
      asientoService.validateBalance(detalles);

      // Validate accounts
      const cuentaIds = [...new Set(detalles.map(d => d.id_cuenta))];
      const cuentas = await CuentaContable.findAll({ where: { id: cuentaIds } });
      if (cuentas.length !== cuentaIds.length) {
        return res.status(400).json({ success: false, error: 'Una o más cuentas no existen' });
      }

      valoresPrevios.detalles_modificados = true;

      const { accountingDb } = require('../../models/accounting');
      await accountingDb.transaction(async (t) => {
        await asiento.update(updates, { transaction: t });
        await AsientoDetalle.destroy({ where: { id_asiento: asiento.id_asiento }, transaction: t });
        await AsientoDetalle.bulkCreate(
          detalles.map(d => ({
            id_asiento: asiento.id_asiento,
            id_cuenta: d.id_cuenta,
            tipo_mov: d.tipo_mov,
            importe: d.importe,
            referencia_operativa: d.referencia_operativa || null
          })),
          { transaction: t }
        );
        await asientoService.registrarEdicion(asiento.id_asiento, req.user.id, valoresPrevios, t);
      });
    } else if (Object.keys(updates).length > 0) {
      await asiento.update(updates);
      if (Object.keys(valoresPrevios).length > 0) {
        await asientoService.registrarEdicion(asiento.id_asiento, req.user.id, valoresPrevios);
      }
    }

    // Re-fetch
    const result = await Asiento.findByPk(asiento.id_asiento, {
      include: [{
        model: AsientoDetalle,
        as: 'detalles',
        include: [{
          model: CuentaContable,
          as: 'cuenta',
          attributes: ['id', 'codigo', 'titulo', 'tipo', 'subtipo']
        }]
      }]
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating asiento:', error);
    if (error.message.includes('no balancea') || error.message.includes('inválido')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Error al actualizar asiento' });
  }
});

// POST /:id/confirmar - Confirm a draft entry
router.post('/:id/confirmar', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const asiento = await asientoService.confirmarAsiento(parseInt(req.params.id), req.user.id);

    const result = await Asiento.findByPk(asiento.id_asiento, {
      include: [{
        model: AsientoDetalle,
        as: 'detalles',
        include: [{
          model: CuentaContable,
          as: 'cuenta',
          attributes: ['id', 'codigo', 'titulo', 'tipo', 'subtipo']
        }]
      }]
    });

    res.json({ success: true, data: result, message: 'Asiento confirmado exitosamente' });
  } catch (error) {
    console.error('Error confirming asiento:', error);
    if (error.message.includes('no encontrado') || error.message.includes('borrador') ||
        error.message.includes('no balancea')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Error al confirmar asiento' });
  }
});

// POST /:id/anular - Void a journal entry (create counter-entry)
router.post('/:id/anular', authorizeRoles('root'), async (req, res) => {
  try {
    const result = await asientoService.anularAsiento(parseInt(req.params.id), req.user.id);

    res.json({
      success: true,
      data: {
        asientoOriginal: result.asientoOriginal,
        contraAsiento: result.contraAsiento
      },
      message: 'Asiento anulado exitosamente'
    });
  } catch (error) {
    console.error('Error voiding asiento:', error);
    if (error.message.includes('no encontrado') || error.message.includes('anulado')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Error al anular asiento' });
  }
});

// DELETE /:id - Soft-delete draft entry only
router.delete('/:id', authorizeRoles('root'), async (req, res) => {
  try {
    await asientoService.eliminarBorrador(parseInt(req.params.id), req.user.id);
    res.json({ success: true, message: 'Asiento eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting asiento:', error);
    if (error.message.includes('no encontrado') || error.message.includes('borrador')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Error al eliminar asiento' });
  }
});

module.exports = router;
