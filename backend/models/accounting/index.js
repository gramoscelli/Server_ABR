/**
 * Accounting Models Index
 * Double-entry bookkeeping system with journal entries (asientos contables)
 */

const { accountingDb } = require('../../config/database');
const CuentaContable = require('./CuentaContable');
const Asiento = require('./Asiento');
const AsientoDetalle = require('./AsientoDetalle');
const CuentaEfectivo = require('./CuentaEfectivo');
const CuentaBancaria = require('./CuentaBancaria');
const CuentaPagoElectronico = require('./CuentaPagoElectronico');
const LiquidacionElectronica = require('./LiquidacionElectronica');
const CashReconciliation = require('./CashReconciliation');
const AsientoAudit = require('./AsientoAudit');

// === Asiento associations ===
Asiento.hasMany(AsientoDetalle, { as: 'detalles', foreignKey: 'id_asiento' });
AsientoDetalle.belongsTo(Asiento, { as: 'asiento', foreignKey: 'id_asiento' });

// Self-referential: contra-asiento → asiento original anulado
Asiento.belongsTo(Asiento, { as: 'asientoAnulado', foreignKey: 'id_asiento_anulado' });
Asiento.hasOne(Asiento, { as: 'contraAsiento', foreignKey: 'id_asiento_anulado' });

// Self-referential: subdiario entries → pase al diario summary entry
Asiento.belongsTo(Asiento, { as: 'paseDiario', foreignKey: 'id_pase_diario' });
Asiento.hasMany(Asiento, { as: 'asientosSubdiario', foreignKey: 'id_pase_diario' });

// === AsientoDetalle → CuentaContable ===
AsientoDetalle.belongsTo(CuentaContable, { as: 'cuenta', foreignKey: 'id_cuenta' });
CuentaContable.hasMany(AsientoDetalle, { as: 'movimientos', foreignKey: 'id_cuenta' });

// === CuentaContable → Extended account tables (1:1) ===
CuentaContable.hasOne(CuentaEfectivo, { as: 'efectivo', foreignKey: 'id_cuenta' });
CuentaEfectivo.belongsTo(CuentaContable, { as: 'cuenta', foreignKey: 'id_cuenta' });

CuentaContable.hasOne(CuentaBancaria, { as: 'bancaria', foreignKey: 'id_cuenta' });
CuentaBancaria.belongsTo(CuentaContable, { as: 'cuenta', foreignKey: 'id_cuenta' });

CuentaContable.hasOne(CuentaPagoElectronico, { as: 'pagoElectronico', foreignKey: 'id_cuenta' });
CuentaPagoElectronico.belongsTo(CuentaContable, { as: 'cuenta', foreignKey: 'id_cuenta' });

// === LiquidacionElectronica associations ===
LiquidacionElectronica.belongsTo(CuentaPagoElectronico, { as: 'cuentaPago', foreignKey: 'id_cuenta' });
CuentaPagoElectronico.hasMany(LiquidacionElectronica, { as: 'liquidaciones', foreignKey: 'id_cuenta' });

LiquidacionElectronica.belongsTo(Asiento, { as: 'asientoOrigen', foreignKey: 'id_asiento_origen' });
LiquidacionElectronica.belongsTo(Asiento, { as: 'asientoAcreditacion', foreignKey: 'id_asiento_acreditacion' });

// === AsientoAudit associations ===
Asiento.hasMany(AsientoAudit, { as: 'auditLog', foreignKey: 'id_asiento' });
AsientoAudit.belongsTo(Asiento, { as: 'asiento', foreignKey: 'id_asiento' });

// === CashReconciliation → CuentaContable ===
CashReconciliation.belongsTo(CuentaContable, { as: 'cuenta', foreignKey: 'id_cuenta' });
CuentaContable.hasMany(CashReconciliation, { as: 'reconciliaciones', foreignKey: 'id_cuenta' });

module.exports = {
  accountingDb,
  CuentaContable,
  Asiento,
  AsientoDetalle,
  CuentaEfectivo,
  CuentaBancaria,
  CuentaPagoElectronico,
  LiquidacionElectronica,
  CashReconciliation,
  AsientoAudit
};
