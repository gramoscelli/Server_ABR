/**
 * CuentaContable Routes (replaces planDeCuentas.js)
 * CRUD for chart of accounts with subtipo and extended tables
 */

const express = require('express');
const router = express.Router();
const { CuentaContable, CuentaEfectivo, CuentaBancaria, CuentaPagoElectronico, AsientoDetalle } = require('../../models/accounting');
const { authorizeRoles } = require('../../middleware/auth');

// Derive tipo from codigo
function deriveTipo(codigo) {
  const first = String(codigo)[0];
  switch (first) {
    case '1': return 'activo';
    case '2': return 'pasivo';
    case '3': return 'patrimonio';
    case '4': return 'ingreso';
    case '5': return 'egreso';
    default: return null;
  }
}

// GET / - List all accounts with optional filters
router.get('/', async (req, res) => {
  try {
    const { tipo, subtipo, is_active, grupo } = req.query;
    const where = {};

    if (tipo) where.tipo = tipo;
    if (subtipo) where.subtipo = subtipo;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (grupo) where.grupo = grupo;

    const cuentas = await CuentaContable.findAll({
      where,
      include: [
        { model: CuentaEfectivo, as: 'efectivo', required: false },
        { model: CuentaBancaria, as: 'bancaria', required: false },
        { model: CuentaPagoElectronico, as: 'pagoElectronico', required: false }
      ],
      order: [['codigo', 'ASC']]
    });

    res.json({ success: true, data: cuentas });
  } catch (error) {
    console.error('Error fetching cuentas contables:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cuentas contables' });
  }
});

// GET /:id - Get single account with extensions
router.get('/:id', async (req, res) => {
  try {
    const cuenta = await CuentaContable.findByPk(req.params.id, {
      include: [
        { model: CuentaEfectivo, as: 'efectivo', required: false },
        { model: CuentaBancaria, as: 'bancaria', required: false },
        { model: CuentaPagoElectronico, as: 'pagoElectronico', required: false }
      ]
    });

    if (!cuenta) {
      return res.status(404).json({ success: false, error: 'Cuenta contable no encontrada' });
    }

    res.json({ success: true, data: cuenta });
  } catch (error) {
    console.error('Error fetching cuenta contable:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cuenta contable' });
  }
});

// GET /by-codigo/:codigo
router.get('/by-codigo/:codigo', async (req, res) => {
  try {
    const cuenta = await CuentaContable.findOne({
      where: { codigo: req.params.codigo },
      include: [
        { model: CuentaEfectivo, as: 'efectivo', required: false },
        { model: CuentaBancaria, as: 'bancaria', required: false },
        { model: CuentaPagoElectronico, as: 'pagoElectronico', required: false }
      ]
    });

    if (!cuenta) {
      return res.status(404).json({ success: false, error: 'Cuenta contable no encontrada' });
    }

    res.json({ success: true, data: cuenta });
  } catch (error) {
    console.error('Error fetching cuenta contable by codigo:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cuenta contable' });
  }
});

// POST / - Create new account
router.post('/', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { codigo, titulo, descripcion, subtipo, requiere_detalle } = req.body;

    if (!codigo || !titulo) {
      return res.status(400).json({ success: false, error: 'Código y título son obligatorios' });
    }

    const codigoStr = String(codigo);
    if (!/^[12345]\d{3,}$/.test(codigoStr)) {
      return res.status(400).json({
        success: false,
        error: 'El código debe comenzar con 1 (activo), 2 (pasivo), 3 (patrimonio), 4 (ingreso) o 5 (egreso) y tener al menos 4 dígitos'
      });
    }

    const tipo = deriveTipo(codigo);
    const grupo = codigoStr.substring(0, 2);

    const existing = await CuentaContable.findOne({ where: { codigo } });
    if (existing) {
      return res.status(409).json({ success: false, error: `Ya existe una cuenta con código ${codigo}` });
    }

    const cuenta = await CuentaContable.create({
      codigo: parseInt(codigo),
      titulo,
      descripcion: descripcion || null,
      tipo,
      subtipo: subtipo || null,
      requiere_detalle: requiere_detalle || false,
      grupo,
      is_active: true
    });

    // Create extended table record if subtipo specified
    if (subtipo === 'efectivo') {
      const { sucursal, responsable, moneda, permite_arqueo } = req.body;
      await CuentaEfectivo.create({
        id_cuenta: cuenta.id,
        sucursal: sucursal || null,
        responsable: responsable || null,
        moneda: moneda || 'ARS',
        permite_arqueo: permite_arqueo !== false
      });
    } else if (subtipo === 'bancaria') {
      const { banco, nro_cuenta, cbu, alias, moneda, tipo_cuenta } = req.body;
      await CuentaBancaria.create({
        id_cuenta: cuenta.id,
        banco: banco || 'Sin especificar',
        nro_cuenta: nro_cuenta || null,
        cbu: cbu || null,
        alias: alias || null,
        moneda: moneda || 'ARS',
        tipo_cuenta: tipo_cuenta || null,
        activa: true
      });
    } else if (subtipo === 'cobro_electronico') {
      const { proveedor, tipo_medio, plazo_acreditacion, liquidacion_diferida } = req.body;
      await CuentaPagoElectronico.create({
        id_cuenta: cuenta.id,
        proveedor: proveedor || 'Sin especificar',
        tipo_medio: tipo_medio || null,
        plazo_acreditacion: plazo_acreditacion || 0,
        liquidacion_diferida: liquidacion_diferida || false
      });
    }

    // Re-fetch with associations
    const result = await CuentaContable.findByPk(cuenta.id, {
      include: [
        { model: CuentaEfectivo, as: 'efectivo', required: false },
        { model: CuentaBancaria, as: 'bancaria', required: false },
        { model: CuentaPagoElectronico, as: 'pagoElectronico', required: false }
      ]
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating cuenta contable:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Ya existe una cuenta con ese código' });
    }
    res.status(500).json({ success: false, error: 'Error al crear cuenta contable' });
  }
});

// PUT /:id - Update account (root only, codigo is immutable)
router.put('/:id', authorizeRoles('root'), async (req, res) => {
  try {
    const cuenta = await CuentaContable.findByPk(req.params.id);
    if (!cuenta) {
      return res.status(404).json({ success: false, error: 'Cuenta contable no encontrada' });
    }

    const { titulo, descripcion, is_active, subtipo, requiere_detalle } = req.body;

    const updates = {};
    if (titulo !== undefined) updates.titulo = titulo;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (is_active !== undefined) updates.is_active = is_active;
    if (subtipo !== undefined) updates.subtipo = subtipo;
    if (requiere_detalle !== undefined) updates.requiere_detalle = requiere_detalle;

    await cuenta.update(updates);

    // Update extended table if needed
    if (subtipo === 'efectivo') {
      const { sucursal, responsable, moneda, permite_arqueo } = req.body;
      await CuentaEfectivo.upsert({
        id_cuenta: cuenta.id,
        sucursal: sucursal || null,
        responsable: responsable || null,
        moneda: moneda || 'ARS',
        permite_arqueo: permite_arqueo !== false
      });
    } else if (subtipo === 'bancaria') {
      const { banco, nro_cuenta, cbu, alias, moneda, tipo_cuenta, activa } = req.body;
      await CuentaBancaria.upsert({
        id_cuenta: cuenta.id,
        banco: banco || 'Sin especificar',
        nro_cuenta: nro_cuenta || null,
        cbu: cbu || null,
        alias: alias || null,
        moneda: moneda || 'ARS',
        tipo_cuenta: tipo_cuenta || null,
        activa: activa !== false
      });
    } else if (subtipo === 'cobro_electronico') {
      const { proveedor, tipo_medio, plazo_acreditacion, liquidacion_diferida } = req.body;
      await CuentaPagoElectronico.upsert({
        id_cuenta: cuenta.id,
        proveedor: proveedor || 'Sin especificar',
        tipo_medio: tipo_medio || null,
        plazo_acreditacion: plazo_acreditacion || 0,
        liquidacion_diferida: liquidacion_diferida || false
      });
    }

    const result = await CuentaContable.findByPk(cuenta.id, {
      include: [
        { model: CuentaEfectivo, as: 'efectivo', required: false },
        { model: CuentaBancaria, as: 'bancaria', required: false },
        { model: CuentaPagoElectronico, as: 'pagoElectronico', required: false }
      ]
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating cuenta contable:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar cuenta contable' });
  }
});

// DELETE /:id - Delete account (only if no movements)
router.delete('/:id', authorizeRoles('root'), async (req, res) => {
  try {
    const cuenta = await CuentaContable.findByPk(req.params.id);
    if (!cuenta) {
      return res.status(404).json({ success: false, error: 'Cuenta contable no encontrada' });
    }

    // Check for existing movements
    const movCount = await AsientoDetalle.count({ where: { id_cuenta: cuenta.id } });
    if (movCount > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede eliminar: la cuenta tiene ${movCount} movimiento(s) asociado(s)`
      });
    }

    // Delete extended records first (cascade should handle, but be explicit)
    await CuentaEfectivo.destroy({ where: { id_cuenta: cuenta.id } });
    await CuentaBancaria.destroy({ where: { id_cuenta: cuenta.id } });
    await CuentaPagoElectronico.destroy({ where: { id_cuenta: cuenta.id } });

    await cuenta.destroy();

    res.json({ success: true, message: 'Cuenta contable eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting cuenta contable:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar cuenta contable' });
  }
});

module.exports = router;
