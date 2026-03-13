/**
 * Accounting Dashboard Routes
 * Summary and analytics based on asiento_detalle
 */

const express = require('express');
const router = express.Router();
const { accountingDb, Asiento, AsientoDetalle, CuentaContable, CuentaEfectivo, CuentaBancaria, CuentaPagoElectronico } = require('../../models/accounting');
const { Op } = require('sequelize');
const asientoService = require('../../services/asientoService');

// GET / - Dashboard summary
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Default: current month
    const now = new Date();
    const periodStart = start_date || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const periodEnd = end_date || now.toISOString().split('T')[0];

    // 1. Get all cuentas with subtipo (financial accounts)
    const cuentasFinancieras = await CuentaContable.findAll({
      where: {
        subtipo: { [Op.ne]: null },
        is_active: true
      },
      include: [
        { model: CuentaEfectivo, as: 'efectivo', required: false },
        { model: CuentaBancaria, as: 'bancaria', required: false },
        { model: CuentaPagoElectronico, as: 'pagoElectronico', required: false }
      ],
      order: [['codigo', 'ASC']]
    });

    // 2. Calculate balances for financial accounts
    const cuentasConSaldo = [];
    for (const cuenta of cuentasFinancieras) {
      const balance = await asientoService.getAccountBalance(cuenta.id, periodEnd);
      cuentasConSaldo.push({
        ...cuenta.toJSON(),
        saldo: balance.saldo,
        total_debe: balance.total_debe,
        total_haber: balance.total_haber
      });
    }

    // 3. Balances by subtipo
    const balanceBySub = { efectivo: 0, bancaria: 0, cobro_electronico: 0, total: 0 };
    for (const c of cuentasConSaldo) {
      const sub = c.subtipo;
      if (balanceBySub[sub] !== undefined) {
        balanceBySub[sub] += c.saldo;
      }
      balanceBySub.total += c.saldo;
    }

    // 4. Period totals: ingresos and egresos from confirmed asientos
    const periodWhere = {
      estado: 'confirmado',
      fecha: { [Op.between]: [periodStart, periodEnd] }
    };

    // Total egresos (movements to egreso-type accounts on debe side)
    const egresos = await AsientoDetalle.findAll({
      attributes: [
        [accountingDb.fn('SUM', accountingDb.col('AsientoDetalle.importe')), 'total']
      ],
      include: [
        { model: Asiento, as: 'asiento', where: periodWhere, attributes: [] },
        { model: CuentaContable, as: 'cuenta', where: { tipo: 'egreso' }, attributes: [] }
      ],
      where: { tipo_mov: 'debe' },
      raw: true
    });

    const ingresos = await AsientoDetalle.findAll({
      attributes: [
        [accountingDb.fn('SUM', accountingDb.col('AsientoDetalle.importe')), 'total']
      ],
      include: [
        { model: Asiento, as: 'asiento', where: periodWhere, attributes: [] },
        { model: CuentaContable, as: 'cuenta', where: { tipo: 'ingreso' }, attributes: [] }
      ],
      where: { tipo_mov: 'haber' },
      raw: true
    });

    const totalEgresos = parseFloat(egresos[0]?.total) || 0;
    const totalIngresos = parseFloat(ingresos[0]?.total) || 0;

    // 5. Top cuentas by movement in period
    const egresosByCuenta = await AsientoDetalle.findAll({
      attributes: [
        'id_cuenta',
        [accountingDb.fn('SUM', accountingDb.col('AsientoDetalle.importe')), 'total'],
        [accountingDb.fn('COUNT', accountingDb.col('AsientoDetalle.id_detalle')), 'count']
      ],
      include: [
        { model: Asiento, as: 'asiento', where: periodWhere, attributes: [] },
        { model: CuentaContable, as: 'cuenta', where: { tipo: 'egreso' }, attributes: ['id', 'codigo', 'titulo'] }
      ],
      where: { tipo_mov: 'debe' },
      group: ['id_cuenta', 'cuenta.id', 'cuenta.codigo', 'cuenta.titulo'],
      order: [[accountingDb.fn('SUM', accountingDb.col('AsientoDetalle.importe')), 'DESC']],
      limit: 10,
      raw: true,
      nest: true
    });

    const ingresosByCuenta = await AsientoDetalle.findAll({
      attributes: [
        'id_cuenta',
        [accountingDb.fn('SUM', accountingDb.col('AsientoDetalle.importe')), 'total'],
        [accountingDb.fn('COUNT', accountingDb.col('AsientoDetalle.id_detalle')), 'count']
      ],
      include: [
        { model: Asiento, as: 'asiento', where: periodWhere, attributes: [] },
        { model: CuentaContable, as: 'cuenta', where: { tipo: 'ingreso' }, attributes: ['id', 'codigo', 'titulo'] }
      ],
      where: { tipo_mov: 'haber' },
      group: ['id_cuenta', 'cuenta.id', 'cuenta.codigo', 'cuenta.titulo'],
      order: [[accountingDb.fn('SUM', accountingDb.col('AsientoDetalle.importe')), 'DESC']],
      limit: 10,
      raw: true,
      nest: true
    });

    // 6. Recent asientos
    const recentAsientos = await Asiento.findAll({
      where: periodWhere,
      include: [{
        model: AsientoDetalle,
        as: 'detalles',
        include: [{
          model: CuentaContable,
          as: 'cuenta',
          attributes: ['id', 'codigo', 'titulo', 'tipo']
        }]
      }],
      order: [['fecha', 'DESC'], ['id_asiento', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        cuentas: cuentasConSaldo,
        balances: {
          total: balanceBySub.total.toFixed(2),
          by_subtipo: {
            efectivo: balanceBySub.efectivo.toFixed(2),
            bancaria: balanceBySub.bancaria.toFixed(2),
            cobro_electronico: balanceBySub.cobro_electronico.toFixed(2)
          }
        },
        period: {
          start_date: periodStart,
          end_date: periodEnd,
          total_egresos: totalEgresos.toFixed(2),
          total_ingresos: totalIngresos.toFixed(2),
          net_result: (totalIngresos - totalEgresos).toFixed(2),
          egresos_by_cuenta: egresosByCuenta,
          ingresos_by_cuenta: ingresosByCuenta
        },
        recent_asientos: recentAsientos
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, error: 'Error al obtener dashboard' });
  }
});

// GET /monthly - Monthly evolution
router.get('/monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();

    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const asientoWhere = {
      estado: 'confirmado',
      fecha: { [Op.between]: [startDate, endDate] }
    };

    const monthlyEgresos = await AsientoDetalle.findAll({
      attributes: [
        [accountingDb.fn('MONTH', accountingDb.col('asiento.fecha')), 'month'],
        [accountingDb.fn('SUM', accountingDb.col('AsientoDetalle.importe')), 'total']
      ],
      include: [
        { model: Asiento, as: 'asiento', where: asientoWhere, attributes: [] },
        { model: CuentaContable, as: 'cuenta', where: { tipo: 'egreso' }, attributes: [] }
      ],
      where: { tipo_mov: 'debe' },
      group: [accountingDb.fn('MONTH', accountingDb.col('asiento.fecha'))],
      raw: true
    });

    const monthlyIngresos = await AsientoDetalle.findAll({
      attributes: [
        [accountingDb.fn('MONTH', accountingDb.col('asiento.fecha')), 'month'],
        [accountingDb.fn('SUM', accountingDb.col('AsientoDetalle.importe')), 'total']
      ],
      include: [
        { model: Asiento, as: 'asiento', where: asientoWhere, attributes: [] },
        { model: CuentaContable, as: 'cuenta', where: { tipo: 'ingreso' }, attributes: [] }
      ],
      where: { tipo_mov: 'haber' },
      group: [accountingDb.fn('MONTH', accountingDb.col('asiento.fecha'))],
      raw: true
    });

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const egreso = monthlyEgresos.find(e => parseInt(e.month) === m);
      const ingreso = monthlyIngresos.find(i => parseInt(i.month) === m);
      const egresoTotal = parseFloat(egreso?.total) || 0;
      const ingresoTotal = parseFloat(ingreso?.total) || 0;

      months.push({
        month: `${targetYear}-${String(m).padStart(2, '0')}`,
        egresos: egresoTotal.toFixed(2),
        ingresos: ingresoTotal.toFixed(2),
        net: (ingresoTotal - egresoTotal).toFixed(2)
      });
    }

    res.json({ success: true, data: months });
  } catch (error) {
    console.error('Error fetching monthly data:', error);
    res.status(500).json({ success: false, error: 'Error al obtener datos mensuales' });
  }
});

module.exports = router;
