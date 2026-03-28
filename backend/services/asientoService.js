/**
 * Asiento Service - Business logic for double-entry journal entries
 */

const { accountingDb, Asiento, AsientoDetalle, CuentaContable, AsientoAudit } = require('../models/accounting');
const { Op } = require('sequelize');

/**
 * Register an audit entry for an asiento action
 */
async function registrarAudit({ id_asiento, accion, usuario_id, detalle, transaction }) {
  return AsientoAudit.create({
    id_asiento,
    accion,
    usuario_id,
    detalle: detalle || null
  }, { transaction: transaction || undefined });
}

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
 * Generate sequential comprobante number for a given date.
 * Uses unscoped() to include soft-deleted entries and avoid reusing numbers.
 */
async function generateComprobante(fecha, transaction) {
  const year = new Date(fecha).getFullYear();
  const prefix = `${year}-`;

  const lastAsiento = await Asiento.unscoped().findOne({
    where: {
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
async function createAsiento({ fecha, origen, concepto, detalles, usuario_id, estado, subdiario }) {
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

  // Validate resultado accounts: ingreso only in haber, egreso only in debe
  const cuentaMap = new Map(cuentas.map(c => [c.id, c]));
  for (const d of detalles) {
    const cuenta = cuentaMap.get(d.id_cuenta);
    if (!cuenta) continue;
    if (cuenta.tipo === 'ingreso' && d.tipo_mov === 'debe') {
      throw new Error(`La cuenta de ingreso "${cuenta.codigo} ${cuenta.titulo}" no puede registrarse en el Debe`);
    }
    if (cuenta.tipo === 'egreso' && d.tipo_mov === 'haber') {
      throw new Error(`La cuenta de egreso "${cuenta.codigo} ${cuenta.titulo}" no puede registrarse en el Haber`);
    }
  }

  const result = await accountingDb.transaction(async (t) => {
    const nro_comprobante = await generateComprobante(fecha, t);

    const asiento = await Asiento.create({
      fecha,
      nro_comprobante,
      origen: origen || 'manual',
      concepto,
      estado: estado || 'borrador',
      usuario_id,
      subdiario: subdiario || null
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

    await registrarAudit({
      id_asiento: asiento.id_asiento,
      accion: 'creado',
      usuario_id,
      detalle: { origen: origen || 'manual', estado: estado || 'borrador' },
      transaction: t
    });

    return { asiento, detalles: detalleRecords };
  });

  return result;
}

/**
 * Confirm a draft journal entry
 */
async function confirmarAsiento(id_asiento, usuario_id) {
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

  await accountingDb.transaction(async (t) => {
    await asiento.update({
      estado: 'confirmado',
      confirmado_por: usuario_id,
      confirmado_at: new Date()
    }, { transaction: t });

    await registrarAudit({
      id_asiento,
      accion: 'confirmado',
      usuario_id,
      transaction: t
    });
  });

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

  if (asiento.id_asiento_anulado) {
    throw new Error('No se puede anular un contra-asiento de anulación');
  }

  const result = await accountingDb.transaction(async (t) => {
    // Create counter-entry with reversed debit/credit
    const nro_comprobante = await generateComprobante(new Date(), t);

    // Format the original date for display
    const fechaOriginal = new Date(asiento.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const contraAsiento = await Asiento.create({
      fecha: new Date(),
      nro_comprobante,
      origen: 'anulacion',
      concepto: `ANULACIÓN de ${asiento.nro_comprobante} (${fechaOriginal}): ${asiento.concepto}`,
      estado: 'confirmado',
      usuario_id,
      id_asiento_anulado: asiento.id_asiento,
      confirmado_por: usuario_id,
      confirmado_at: new Date()
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
    await asiento.update({
      estado: 'anulado',
      anulado_por: usuario_id,
      anulado_at: new Date()
    }, { transaction: t });

    // Audit for original entry (anulado)
    await registrarAudit({
      id_asiento: asiento.id_asiento,
      accion: 'anulado',
      usuario_id,
      detalle: { contra_asiento_id: contraAsiento.id_asiento },
      transaction: t
    });

    // Audit for contra-asiento (creado)
    await registrarAudit({
      id_asiento: contraAsiento.id_asiento,
      accion: 'creado',
      usuario_id,
      detalle: { origen: 'anulacion', asiento_anulado_id: asiento.id_asiento },
      transaction: t
    });

    return { asientoOriginal: asiento, contraAsiento };
  });

  return result;
}

/**
 * Soft-delete a draft journal entry
 */
async function eliminarBorrador(id_asiento, usuario_id) {
  const asiento = await Asiento.findByPk(id_asiento);

  if (!asiento) {
    throw new Error('Asiento no encontrado');
  }

  // Allow deleting: borradores always, confirmed caja entries if not yet posted to diario
  const isCajaEditable = asiento.subdiario === 'caja' && !asiento.id_pase_diario;
  if (asiento.estado !== 'borrador' && !(asiento.estado === 'confirmado' && isCajaEditable)) {
    throw new Error(asiento.id_pase_diario
      ? 'No se pueden eliminar asientos ya pasados al libro diario'
      : 'Solo se pueden eliminar asientos en estado borrador. Use anular para asientos confirmados.');
  }

  await accountingDb.transaction(async (t) => {
    await asiento.update({
      eliminado: true,
      eliminado_por: usuario_id,
      eliminado_at: new Date()
    }, { transaction: t });

    await registrarAudit({
      id_asiento,
      accion: 'eliminado',
      usuario_id,
      detalle: { nro_comprobante: asiento.nro_comprobante, concepto: asiento.concepto },
      transaction: t
    });
  });

  return asiento;
}

/**
 * Register an edit audit with previous values
 */
async function registrarEdicion(id_asiento, usuario_id, valoresPrevios, transaction) {
  return registrarAudit({
    id_asiento,
    accion: 'editado',
    usuario_id,
    detalle: { valores_previos: valoresPrevios },
    transaction
  });
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

/**
 * Preview the summary entry that would be generated for a subdiario pase on a given date or date range.
 * Returns the detail lines (net movement per account) without persisting anything.
 */
async function previewPaseDiario(fecha, subdiario = 'caja', fechaHasta = null) {
  const whereClause = {
    subdiario,
    estado: 'confirmado',
    id_pase_diario: null
  };
  if (fechaHasta) {
    whereClause.fecha = { [Op.between]: [fecha, fechaHasta] };
  } else {
    whereClause.fecha = fecha;
  }

  // Find all confirmed subdiario entries that haven't been posted yet
  const asientos = await Asiento.findAll({
    where: whereClause,
    include: [{
      model: AsientoDetalle,
      as: 'detalles',
      include: [{
        model: CuentaContable,
        as: 'cuenta',
        attributes: ['id', 'codigo', 'titulo', 'tipo', 'subtipo']
      }]
    }],
    order: [['id_asiento', 'ASC']]
  });

  if (asientos.length === 0) {
    return { asientos: [], detalles: [], totalDebe: 0, totalHaber: 0 };
  }

  // Aggregate net movement per account
  const netByCuenta = {};
  for (const asiento of asientos) {
    for (const det of asiento.detalles) {
      const key = det.id_cuenta;
      if (!netByCuenta[key]) {
        netByCuenta[key] = { id_cuenta: key, cuenta: det.cuenta, neto: 0 };
      }
      const importe = parseFloat(det.importe);
      netByCuenta[key].neto += det.tipo_mov === 'debe' ? importe : -importe;
    }
  }

  // Build summary lines: positive net = debe, negative net = haber
  const detalles = [];
  let totalDebe = 0;
  let totalHaber = 0;

  for (const entry of Object.values(netByCuenta)) {
    if (Math.abs(entry.neto) < 0.01) continue; // skip zero-net accounts
    if (entry.neto > 0) {
      detalles.push({
        id_cuenta: entry.id_cuenta,
        cuenta: entry.cuenta,
        tipo_mov: 'debe',
        importe: Math.round(entry.neto * 100) / 100
      });
      totalDebe += Math.round(entry.neto * 100) / 100;
    } else {
      detalles.push({
        id_cuenta: entry.id_cuenta,
        cuenta: entry.cuenta,
        tipo_mov: 'haber',
        importe: Math.round(Math.abs(entry.neto) * 100) / 100
      });
      totalHaber += Math.round(Math.abs(entry.neto) * 100) / 100;
    }
  }

  // Sort: debe first, then haber
  detalles.sort((a, b) => {
    if (a.tipo_mov === b.tipo_mov) return 0;
    return a.tipo_mov === 'debe' ? -1 : 1;
  });

  return {
    fecha,
    fechaHasta: fechaHasta || fecha,
    asientosCount: asientos.length,
    asientos: asientos.map(a => ({
      id_asiento: a.id_asiento,
      nro_comprobante: a.nro_comprobante,
      concepto: a.concepto,
      origen: a.origen,
      fecha: a.fecha
    })),
    detalles,
    totalDebe: Math.round(totalDebe * 100) / 100,
    totalHaber: Math.round(totalHaber * 100) / 100
  };
}

/**
 * Execute the pase al diario: create a summary entry and link all subdiario entries to it.
 */
async function generarPaseDiario(fecha, usuario_id, subdiario = 'caja', fechaHasta = null) {
  const preview = await previewPaseDiario(fecha, subdiario, fechaHasta);

  if (preview.asientosCount === 0) {
    throw new Error(fechaHasta
      ? `No hay movimientos pendientes de pase entre ${fecha} y ${fechaHasta}`
      : `No hay movimientos pendientes de pase para la fecha ${fecha}`);
  }

  if (preview.detalles.length < 2) {
    throw new Error('El asiento resumen debe tener al menos 2 líneas de detalle');
  }

  // Validate balance
  if (Math.abs(preview.totalDebe - preview.totalHaber) > 0.009) {
    throw new Error(
      `El resumen no balancea. Debe: ${preview.totalDebe.toFixed(2)}, Haber: ${preview.totalHaber.toFixed(2)}`
    );
  }

  const formatDate = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const fechaDisplay = fechaHasta && fechaHasta !== fecha
    ? `${formatDate(fecha)} al ${formatDate(fechaHasta)}`
    : formatDate(fecha);

  const subdiarioLabel = subdiario === 'caja' ? 'Caja' : subdiario;
  // Use the last date in the range for the asiento date
  const fechaAsiento = fechaHasta || fecha;

  const result = await accountingDb.transaction(async (t) => {
    const nro_comprobante = await generateComprobante(fechaAsiento, t);

    // Create summary entry
    const asientoResumen = await Asiento.create({
      fecha: fechaAsiento,
      nro_comprobante,
      origen: 'pase_subdiario',
      concepto: `Pase subdiario de ${subdiarioLabel} — ${fechaDisplay} (${preview.asientosCount} movimientos)`,
      estado: 'confirmado',
      usuario_id,
      subdiario: null, // summary entry belongs to the libro diario, not the subdiario
      confirmado_por: usuario_id,
      confirmado_at: new Date()
    }, { transaction: t });

    // Create detail lines
    await AsientoDetalle.bulkCreate(
      preview.detalles.map(d => ({
        id_asiento: asientoResumen.id_asiento,
        id_cuenta: d.id_cuenta,
        tipo_mov: d.tipo_mov,
        importe: d.importe,
        referencia_operativa: `Pase subdiario ${subdiarioLabel} ${fechaDisplay}`
      })),
      { transaction: t }
    );

    // Link original subdiario entries to this summary
    const asientoIds = preview.asientos.map(a => a.id_asiento);
    await Asiento.update(
      { id_pase_diario: asientoResumen.id_asiento },
      { where: { id_asiento: { [Op.in]: asientoIds } }, transaction: t }
    );

    // Audit for summary entry
    await registrarAudit({
      id_asiento: asientoResumen.id_asiento,
      accion: 'creado',
      usuario_id,
      detalle: { origen: 'pase_subdiario', asientos_vinculados: asientoIds },
      transaction: t
    });

    // Audit for each linked subdiario entry
    for (const asientoId of asientoIds) {
      await registrarAudit({
        id_asiento: asientoId,
        accion: 'pase_diario',
        usuario_id,
        detalle: { id_pase_diario: asientoResumen.id_asiento },
        transaction: t
      });
    }

    return asientoResumen;
  });

  return {
    asientoResumen: result,
    asientosVinculados: preview.asientosCount
  };
}

/**
 * Get dates that have pending (unposted) subdiario entries
 */
async function getPendientesPase(subdiario = 'caja') {
  const results = await Asiento.findAll({
    where: {
      subdiario,
      estado: 'confirmado',
      id_pase_diario: null
    },
    attributes: [
      'fecha',
      [accountingDb.fn('COUNT', accountingDb.col('id_asiento')), 'count'],
      [accountingDb.fn('SUM',
        accountingDb.literal(`(SELECT SUM(d.importe) FROM asiento_detalle d WHERE d.id_asiento = Asiento.id_asiento AND d.tipo_mov = 'debe')`)
      ), 'total_debe']
    ],
    group: ['fecha'],
    order: [['fecha', 'DESC']],
    raw: true
  });

  return results.map(r => ({
    fecha: r.fecha,
    count: parseInt(r.count),
    total_debe: parseFloat(r.total_debe) || 0
  }));
}

module.exports = {
  validateBalance,
  generateComprobante,
  createAsiento,
  confirmarAsiento,
  anularAsiento,
  eliminarBorrador,
  registrarAudit,
  registrarEdicion,
  getAccountBalance,
  previewPaseDiario,
  generarPaseDiario,
  getPendientesPase
};
