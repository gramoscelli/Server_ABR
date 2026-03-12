/**
 * Asiento Service - Business logic for double-entry journal entries
 */

const { accountingDb, Asiento, AsientoDetalle, CuentaContable } = require('../models/accounting');
const { Op } = require('sequelize');

/**
 * Validate that total debits equal total credits
 */
function validateBalance(detalles) {
  let totalDebe = 0;
  let totalHaber = 0;

  for (const d of detalles) {
    const importe = parseFloat(d.importe);
    if (isNaN(importe) || importe <= 0) {
      throw new Error(`Importe inválido: ${d.importe}`);
    }
    if (d.tipo_mov === 'debe') {
      totalDebe += importe;
    } else if (d.tipo_mov === 'haber') {
      totalHaber += importe;
    } else {
      throw new Error(`Tipo de movimiento inválido: ${d.tipo_mov}`);
    }
  }

  // Compare with tolerance for floating point
  if (Math.abs(totalDebe - totalHaber) > 0.009) {
    throw new Error(
      `El asiento no balancea. Debe: ${totalDebe.toFixed(2)}, Haber: ${totalHaber.toFixed(2)}`
    );
  }

  return { totalDebe, totalHaber };
}

/**
 * Generate sequential comprobante number for a given date
 */
async function generateComprobante(fecha, transaction) {
  const year = new Date(fecha).getFullYear();
  const prefix = `${year}-`;

  const lastAsiento = await Asiento.findOne({
    where: {
      nro_comprobante: {
        [Op.like]: `${prefix}%`
      },
      // Exclude migration comprobantes
      nro_comprobante: {
        [Op.and]: [
          { [Op.like]: `${prefix}%` },
          { [Op.notLike]: 'MIG-%' }
        ]
      }
    },
    order: [['nro_comprobante', 'DESC']],
    transaction
  });

  let nextNum = 1;
  if (lastAsiento) {
    const lastNum = parseInt(lastAsiento.nro_comprobante.replace(prefix, ''), 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(6, '0')}`;
}

/**
 * Create a journal entry (asiento) with detail lines in a transaction
 */
async function createAsiento({ fecha, origen, concepto, detalles, usuario_id, estado }) {
  if (!detalles || detalles.length < 2) {
    throw new Error('Un asiento debe tener al menos 2 líneas de detalle');
  }

  validateBalance(detalles);

  // Validate all accounts exist and are active
  const cuentaIds = [...new Set(detalles.map(d => d.id_cuenta))];
  const cuentas = await CuentaContable.findAll({
    where: { id: cuentaIds }
  });

  if (cuentas.length !== cuentaIds.length) {
    const found = cuentas.map(c => c.id);
    const missing = cuentaIds.filter(id => !found.includes(id));
    throw new Error(`Cuentas no encontradas: ${missing.join(', ')}`);
  }

  const inactive = cuentas.filter(c => !c.is_active);
  if (inactive.length > 0) {
    throw new Error(`Cuentas inactivas: ${inactive.map(c => `${c.codigo} ${c.titulo}`).join(', ')}`);
  }

  const result = await accountingDb.transaction(async (t) => {
    const nro_comprobante = await generateComprobante(fecha, t);

    const asiento = await Asiento.create({
      fecha,
      nro_comprobante,
      origen: origen || 'manual',
      concepto,
      estado: estado || 'borrador',
      usuario_id
    }, { transaction: t });

    const detalleRecords = await AsientoDetalle.bulkCreate(
      detalles.map(d => ({
        id_asiento: asiento.id_asiento,
        id_cuenta: d.id_cuenta,
        tipo_mov: d.tipo_mov,
        importe: d.importe,
        referencia_operativa: d.referencia_operativa || null
      })),
      { transaction: t }
    );

    return { asiento, detalles: detalleRecords };
  });

  return result;
}

/**
 * Confirm a draft journal entry
 */
async function confirmarAsiento(id_asiento) {
  const asiento = await Asiento.findByPk(id_asiento, {
    include: [{ model: AsientoDetalle, as: 'detalles' }]
  });

  if (!asiento) {
    throw new Error('Asiento no encontrado');
  }

  if (asiento.estado !== 'borrador') {
    throw new Error(`Solo se pueden confirmar asientos en estado borrador. Estado actual: ${asiento.estado}`);
  }

  // Re-validate balance
  validateBalance(asiento.detalles.map(d => ({
    tipo_mov: d.tipo_mov,
    importe: d.importe
  })));

  await asiento.update({ estado: 'confirmado' });
  return asiento;
}

/**
 * Void a journal entry by creating a counter-entry
 */
async function anularAsiento(id_asiento, usuario_id) {
  const asiento = await Asiento.findByPk(id_asiento, {
    include: [{ model: AsientoDetalle, as: 'detalles' }]
  });

  if (!asiento) {
    throw new Error('Asiento no encontrado');
  }

  if (asiento.estado === 'anulado') {
    throw new Error('El asiento ya está anulado');
  }

  const result = await accountingDb.transaction(async (t) => {
    // Create counter-entry with reversed debit/credit
    const nro_comprobante = await generateComprobante(new Date(), t);

    const contraAsiento = await Asiento.create({
      fecha: new Date(),
      nro_comprobante,
      origen: asiento.origen,
      concepto: `ANULACIÓN de ${asiento.nro_comprobante}: ${asiento.concepto}`,
      estado: 'confirmado',
      usuario_id
    }, { transaction: t });

    await AsientoDetalle.bulkCreate(
      asiento.detalles.map(d => ({
        id_asiento: contraAsiento.id_asiento,
        id_cuenta: d.id_cuenta,
        tipo_mov: d.tipo_mov === 'debe' ? 'haber' : 'debe', // Reverse
        importe: d.importe,
        referencia_operativa: `Anulación de asiento #${asiento.nro_comprobante}`
      })),
      { transaction: t }
    );

    // Mark original as voided
    await asiento.update({ estado: 'anulado' }, { transaction: t });

    return { asientoOriginal: asiento, contraAsiento };
  });

  return result;
}

/**
 * Calculate account balance as of a given date from confirmed journal entries
 * For activo/egreso: balance = sum(debe) - sum(haber)
 * For pasivo/patrimonio/ingreso: balance = sum(haber) - sum(debe)
 */
async function getAccountBalance(cuentaId, asOfDate) {
  const cuenta = await CuentaContable.findByPk(cuentaId);
  if (!cuenta) {
    throw new Error('Cuenta no encontrada');
  }

  const whereClause = {
    id_cuenta: cuentaId
  };

  const asientoWhere = {
    estado: 'confirmado'
  };

  if (asOfDate) {
    asientoWhere.fecha = { [Op.lte]: asOfDate };
  }

  const results = await AsientoDetalle.findAll({
    where: whereClause,
    include: [{
      model: Asiento,
      as: 'asiento',
      where: asientoWhere,
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

  for (const r of results) {
    if (r.tipo_mov === 'debe') totalDebe = parseFloat(r.total) || 0;
    if (r.tipo_mov === 'haber') totalHaber = parseFloat(r.total) || 0;
  }

  // Debit-normal accounts: activo, egreso
  // Credit-normal accounts: pasivo, patrimonio, ingreso
  const debitNormal = ['activo', 'egreso'].includes(cuenta.tipo);
  const saldo = debitNormal ? (totalDebe - totalHaber) : (totalHaber - totalDebe);

  return {
    cuenta_id: cuentaId,
    codigo: cuenta.codigo,
    titulo: cuenta.titulo,
    tipo: cuenta.tipo,
    total_debe: totalDebe,
    total_haber: totalHaber,
    saldo,
    as_of_date: asOfDate || 'all'
  };
}

module.exports = {
  validateBalance,
  generateComprobante,
  createAsiento,
  confirmarAsiento,
  anularAsiento,
  getAccountBalance
};
