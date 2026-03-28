/**
 * Audit Service - Logs administrative actions to audit_log table
 */

const { AuditLog } = require('../models');

/**
 * Record an audit log entry
 * @param {Object} params
 * @param {string} params.accion - Action (e.g. 'user.create', 'role.update')
 * @param {string} params.entidad - Entity type (e.g. 'user', 'role')
 * @param {number|null} params.entidad_id - ID of the affected entity
 * @param {number} params.usuario_id - User who performed the action
 * @param {Object|null} params.detalle - Additional context
 * @param {string|null} params.ip - IP address
 */
async function registrarAudit({ accion, entidad, entidad_id, usuario_id, detalle = null, ip = null }) {
  try {
    await AuditLog.create({
      accion,
      entidad,
      entidad_id,
      usuario_id,
      detalle,
      ip
    });
  } catch (error) {
    // Audit logging should never break the main operation
    console.error('[AuditService] Error recording audit log:', error.message);
  }
}

/**
 * Helper to extract client IP from request
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
}

module.exports = {
  registrarAudit,
  getClientIp
};
