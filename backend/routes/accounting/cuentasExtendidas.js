/**
 * Cuentas Extendidas Routes
 * CRUD for cuenta_efectivo, cuenta_bancaria, cuenta_pago_electronico
 */

const express = require('express');
const router = express.Router();
const { CuentaContable, CuentaEfectivo, CuentaBancaria, CuentaPagoElectronico } = require('../../models/accounting');
const { authorizeRoles } = require('../../middleware/auth');

// GET /efectivo - List cash accounts
router.get('/efectivo', async (req, res) => {
  try {
    const cuentas = await CuentaEfectivo.findAll({
      include: [{
        model: CuentaContable,
        as: 'cuenta',
        attributes: ['id', 'codigo', 'titulo', 'tipo', 'is_active']
      }]
    });
    res.json({ success: true, data: cuentas });
  } catch (error) {
    console.error('Error fetching cash accounts:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cuentas de efectivo' });
  }
});

// GET /bancarias - List bank accounts
router.get('/bancarias', async (req, res) => {
  try {
    const cuentas = await CuentaBancaria.findAll({
      include: [{
        model: CuentaContable,
        as: 'cuenta',
        attributes: ['id', 'codigo', 'titulo', 'tipo', 'is_active']
      }]
    });
    res.json({ success: true, data: cuentas });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cuentas bancarias' });
  }
});

// GET /pago-electronico - List electronic payment accounts
router.get('/pago-electronico', async (req, res) => {
  try {
    const cuentas = await CuentaPagoElectronico.findAll({
      include: [{
        model: CuentaContable,
        as: 'cuenta',
        attributes: ['id', 'codigo', 'titulo', 'tipo', 'is_active']
      }]
    });
    res.json({ success: true, data: cuentas });
  } catch (error) {
    console.error('Error fetching electronic payment accounts:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cuentas de pago electrónico' });
  }
});

// PUT /efectivo/:id - Update cash account details
router.put('/efectivo/:id', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const cuenta = await CuentaEfectivo.findByPk(req.params.id);
    if (!cuenta) {
      return res.status(404).json({ success: false, error: 'Cuenta de efectivo no encontrada' });
    }

    const { sucursal, responsable, moneda, permite_arqueo } = req.body;
    await cuenta.update({
      ...(sucursal !== undefined && { sucursal }),
      ...(responsable !== undefined && { responsable }),
      ...(moneda !== undefined && { moneda }),
      ...(permite_arqueo !== undefined && { permite_arqueo })
    });

    const result = await CuentaEfectivo.findByPk(cuenta.id_cuenta, {
      include: [{ model: CuentaContable, as: 'cuenta' }]
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating cash account:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar cuenta de efectivo' });
  }
});

// PUT /bancarias/:id - Update bank account details
router.put('/bancarias/:id', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const cuenta = await CuentaBancaria.findByPk(req.params.id);
    if (!cuenta) {
      return res.status(404).json({ success: false, error: 'Cuenta bancaria no encontrada' });
    }

    const { banco, nro_cuenta, cbu, alias, moneda, tipo_cuenta, activa } = req.body;
    await cuenta.update({
      ...(banco !== undefined && { banco }),
      ...(nro_cuenta !== undefined && { nro_cuenta }),
      ...(cbu !== undefined && { cbu }),
      ...(alias !== undefined && { alias }),
      ...(moneda !== undefined && { moneda }),
      ...(tipo_cuenta !== undefined && { tipo_cuenta }),
      ...(activa !== undefined && { activa })
    });

    const result = await CuentaBancaria.findByPk(cuenta.id_cuenta, {
      include: [{ model: CuentaContable, as: 'cuenta' }]
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating bank account:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar cuenta bancaria' });
  }
});

// PUT /pago-electronico/:id - Update electronic payment account details
router.put('/pago-electronico/:id', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const cuenta = await CuentaPagoElectronico.findByPk(req.params.id);
    if (!cuenta) {
      return res.status(404).json({ success: false, error: 'Cuenta de pago electrónico no encontrada' });
    }

    const { proveedor, tipo_medio, plazo_acreditacion, liquidacion_diferida } = req.body;
    await cuenta.update({
      ...(proveedor !== undefined && { proveedor }),
      ...(tipo_medio !== undefined && { tipo_medio }),
      ...(plazo_acreditacion !== undefined && { plazo_acreditacion }),
      ...(liquidacion_diferida !== undefined && { liquidacion_diferida })
    });

    const result = await CuentaPagoElectronico.findByPk(cuenta.id_cuenta, {
      include: [{ model: CuentaContable, as: 'cuenta' }]
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating electronic payment account:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar cuenta de pago electrónico' });
  }
});

module.exports = router;
