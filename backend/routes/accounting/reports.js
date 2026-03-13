/**
 * Accounting Reports Routes
 * Libro diario, mayores, balance de sumas y saldos, estado de resultados
 */

const express = require('express');
const router = express.Router();
const { accountingDb, Asiento, AsientoDetalle, CuentaContable } = require('../../models/accounting');
const asientoService = require('../../services/asientoService');
const { Op } = require('sequelize');

// GET /libro-diario - Journal book
router.get('/libro-diario', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'Se requieren fecha de inicio y fin' });
    }

    const asientos = await Asiento.findAll({
      where: {
        estado: { [Op.in]: ['confirmado', 'anulado'] },
        fecha: { [Op.between]: [start_date, end_date] }
      },
      include: [
        {
          model: AsientoDetalle,
          as: 'detalles',
          include: [{
            model: CuentaContable,
            as: 'cuenta',
            attributes: ['id', 'codigo', 'titulo', 'tipo', 'grupo']
          }]
        },
        {
          model: Asiento,
          as: 'asientoAnulado',
          attributes: ['id_asiento', 'nro_comprobante', 'fecha', 'concepto'],
          required: false
        }
      ],
      order: [['fecha', 'ASC'], ['id_asiento', 'ASC']]
    });

    let totalDebe = 0;
    let totalHaber = 0;
    for (const a of asientos) {
      for (const d of a.detalles) {
        if (d.tipo_mov === 'debe') totalDebe += parseFloat(d.importe);
        else totalHaber += parseFloat(d.importe);
      }
    }

    res.json({
      success: true,
      data: {
        asientos,
        totals: { debe: totalDebe.toFixed(2), haber: totalHaber.toFixed(2) },
        period: { start_date, end_date }
      }
    });
  } catch (error) {
    console.error('Error fetching libro diario:', error);
    res.status(500).json({ success: false, error: 'Error al obtener libro diario' });
  }
});

// GET /mayor/:cuentaId - Ledger for a specific account
router.get('/mayor/:cuentaId', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const cuentaId = parseInt(req.params.cuentaId);

    const cuenta = await CuentaContable.findByPk(cuentaId);
    if (!cuenta) {
      return res.status(404).json({ success: false, error: 'Cuenta no encontrada' });
    }

    const asientoWhere = { estado: 'confirmado' };
    if (start_date || end_date) {
      asientoWhere.fecha = {};
      if (start_date) asientoWhere.fecha[Op.gte] = start_date;
      if (end_date) asientoWhere.fecha[Op.lte] = end_date;
    }

    const movimientos = await AsientoDetalle.findAll({
      where: { id_cuenta: cuentaId },
      include: [{
        model: Asiento,
        as: 'asiento',
        where: asientoWhere,
        attributes: ['id_asiento', 'fecha', 'nro_comprobante', 'concepto', 'origen']
      }],
      order: [[{ model: Asiento, as: 'asiento' }, 'fecha', 'ASC'], ['id_detalle', 'ASC']]
    });

    const debitNormal = ['activo', 'egreso'].includes(cuenta.tipo);
    let saldoAcumulado = 0;
    const movimientosConSaldo = movimientos.map(m => {
      const importe = parseFloat(m.importe);
      if (m.tipo_mov === 'debe') {
        saldoAcumulado += debitNormal ? importe : -importe;
      } else {
        saldoAcumulado += debitNormal ? -importe : importe;
      }
      return { ...m.toJSON(), saldo_acumulado: saldoAcumulado.toFixed(2) };
    });

    let totalDebe = 0;
    let totalHaber = 0;
    for (const m of movimientos) {
      if (m.tipo_mov === 'debe') totalDebe += parseFloat(m.importe);
      else totalHaber += parseFloat(m.importe);
    }

    res.json({
      success: true,
      data: {
        cuenta: { id: cuenta.id, codigo: cuenta.codigo, titulo: cuenta.titulo, tipo: cuenta.tipo },
        movimientos: movimientosConSaldo,
        totals: { debe: totalDebe.toFixed(2), haber: totalHaber.toFixed(2), saldo: saldoAcumulado.toFixed(2) }
      }
    });
  } catch (error) {
    console.error('Error fetching mayor:', error);
    res.status(500).json({ success: false, error: 'Error al obtener mayor' });
  }
});

// GET /balance-sumas-saldos - Trial balance
router.get('/balance-sumas-saldos', async (req, res) => {
  try {
    const { as_of_date } = req.query;

    const asientoWhere = { estado: 'confirmado' };
    if (as_of_date) {
      asientoWhere.fecha = { [Op.lte]: as_of_date };
    }

    const movimientos = await AsientoDetalle.findAll({
      attributes: [
        'id_cuenta',
        'tipo_mov',
        [accountingDb.fn('SUM', accountingDb.col('AsientoDetalle.importe')), 'total']
      ],
      include: [{
        model: Asiento,
        as: 'asiento',
        where: asientoWhere,
        attributes: []
      }],
      group: ['id_cuenta', 'tipo_mov'],
      raw: true
    });

    const accountMap = {};
    for (const m of movimientos) {
      if (!accountMap[m.id_cuenta]) accountMap[m.id_cuenta] = { debe: 0, haber: 0 };
      accountMap[m.id_cuenta][m.tipo_mov] = parseFloat(m.total) || 0;
    }

    const cuentaIds = Object.keys(accountMap).map(Number);
    const cuentas = await CuentaContable.findAll({
      where: { id: cuentaIds },
      order: [['codigo', 'ASC']]
    });

    const rows = cuentas.map(c => {
      const mov = accountMap[c.id] || { debe: 0, haber: 0 };
      const debitNormal = ['activo', 'egreso'].includes(c.tipo);
      const saldo = debitNormal ? (mov.debe - mov.haber) : (mov.haber - mov.debe);

      return {
        id: c.id, codigo: c.codigo, titulo: c.titulo, tipo: c.tipo, grupo: c.grupo,
        suma_debe: mov.debe.toFixed(2), suma_haber: mov.haber.toFixed(2),
        saldo_deudor: saldo > 0 ? saldo.toFixed(2) : '0.00',
        saldo_acreedor: saldo < 0 ? Math.abs(saldo).toFixed(2) : '0.00'
      };
    });

    let totalSumaDebe = 0, totalSumaHaber = 0, totalSaldoDeudor = 0, totalSaldoAcreedor = 0;
    for (const r of rows) {
      totalSumaDebe += parseFloat(r.suma_debe);
      totalSumaHaber += parseFloat(r.suma_haber);
      totalSaldoDeudor += parseFloat(r.saldo_deudor);
      totalSaldoAcreedor += parseFloat(r.saldo_acreedor);
    }

    res.json({
      success: true,
      data: {
        rows,
        totals: {
          suma_debe: totalSumaDebe.toFixed(2), suma_haber: totalSumaHaber.toFixed(2),
          saldo_deudor: totalSaldoDeudor.toFixed(2), saldo_acreedor: totalSaldoAcreedor.toFixed(2)
        },
        as_of_date: as_of_date || 'all'
      }
    });
  } catch (error) {
    console.error('Error fetching balance de sumas y saldos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener balance de sumas y saldos' });
  }
});

// GET /estado-resultados - Income statement
router.get('/estado-resultados', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'Se requieren fecha de inicio y fin' });
    }

    const asientoWhere = {
      estado: 'confirmado',
      fecha: { [Op.between]: [start_date, end_date] }
    };

    const buildGrouped = async (tipo, tipoMov) => {
      const data = await AsientoDetalle.findAll({
        attributes: [
          'id_cuenta', 'tipo_mov',
          [accountingDb.fn('SUM', accountingDb.col('AsientoDetalle.importe')), 'total']
        ],
        include: [
          { model: Asiento, as: 'asiento', where: asientoWhere, attributes: [] },
          { model: CuentaContable, as: 'cuenta', where: { tipo }, attributes: [] }
        ],
        group: ['id_cuenta', 'tipo_mov'],
        raw: true
      });

      const map = {};
      for (const m of data) {
        if (!map[m.id_cuenta]) map[m.id_cuenta] = { debe: 0, haber: 0 };
        map[m.id_cuenta][m.tipo_mov] = parseFloat(m.total) || 0;
      }

      const debitNormal = ['activo', 'egreso'].includes(tipo);
      return Object.entries(map).map(([id, mov]) => ({
        id: parseInt(id),
        total: debitNormal ? (mov.debe - mov.haber) : (mov.haber - mov.debe)
      }));
    };

    const ingresoBalances = await buildGrouped('ingreso');
    const egresoBalances = await buildGrouped('egreso');

    const allIds = [...ingresoBalances.map(b => b.id), ...egresoBalances.map(b => b.id)];
    const cuentas = await CuentaContable.findAll({
      where: { id: allIds },
      attributes: ['id', 'codigo', 'titulo', 'tipo', 'grupo']
    });
    const cuentaMap = {};
    for (const c of cuentas) cuentaMap[c.id] = c;

    const ingresoRows = ingresoBalances
      .map(b => ({ ...cuentaMap[b.id]?.toJSON(), total: b.total.toFixed(2) }))
      .filter(r => r.codigo)
      .sort((a, b) => a.codigo - b.codigo);

    const egresoRows = egresoBalances
      .map(b => ({ ...cuentaMap[b.id]?.toJSON(), total: b.total.toFixed(2) }))
      .filter(r => r.codigo)
      .sort((a, b) => a.codigo - b.codigo);

    const totalIngresos = ingresoBalances.reduce((sum, b) => sum + b.total, 0);
    const totalEgresos = egresoBalances.reduce((sum, b) => sum + b.total, 0);

    res.json({
      success: true,
      data: {
        ingresos: { rows: ingresoRows, total: totalIngresos.toFixed(2) },
        egresos: { rows: egresoRows, total: totalEgresos.toFixed(2) },
        resultado_neto: (totalIngresos - totalEgresos).toFixed(2),
        period: { start_date, end_date }
      }
    });
  } catch (error) {
    console.error('Error fetching estado de resultados:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estado de resultados' });
  }
});

// GET /balance-general - Balance sheet
router.get('/balance-general', async (req, res) => {
  try {
    const { as_of_date } = req.query;

    const cuentas = await CuentaContable.findAll({
      where: {
        tipo: { [Op.in]: ['activo', 'pasivo', 'patrimonio'] },
        is_active: true
      },
      order: [['codigo', 'ASC']]
    });

    const rows = [];
    for (const cuenta of cuentas) {
      const balance = await asientoService.getAccountBalance(cuenta.id, as_of_date);
      if (balance.saldo !== 0) {
        rows.push({
          id: cuenta.id, codigo: cuenta.codigo, titulo: cuenta.titulo,
          tipo: cuenta.tipo, grupo: cuenta.grupo, saldo: balance.saldo.toFixed(2)
        });
      }
    }

    const activos = rows.filter(r => r.tipo === 'activo');
    const pasivos = rows.filter(r => r.tipo === 'pasivo');
    const patrimonio = rows.filter(r => r.tipo === 'patrimonio');

    const totalActivos = activos.reduce((sum, r) => sum + parseFloat(r.saldo), 0);
    const totalPasivos = pasivos.reduce((sum, r) => sum + parseFloat(r.saldo), 0);
    const totalPatrimonio = patrimonio.reduce((sum, r) => sum + parseFloat(r.saldo), 0);

    res.json({
      success: true,
      data: {
        activos: { rows: activos, total: totalActivos.toFixed(2) },
        pasivos: { rows: pasivos, total: totalPasivos.toFixed(2) },
        patrimonio: { rows: patrimonio, total: totalPatrimonio.toFixed(2) },
        check: {
          total_activo: totalActivos.toFixed(2),
          total_pasivo_patrimonio: (totalPasivos + totalPatrimonio).toFixed(2),
          balanced: Math.abs(totalActivos - (totalPasivos + totalPatrimonio)) < 0.01
        },
        as_of_date: as_of_date || 'all'
      }
    });
  } catch (error) {
    console.error('Error fetching balance general:', error);
    res.status(500).json({ success: false, error: 'Error al obtener balance general' });
  }
});

module.exports = router;
