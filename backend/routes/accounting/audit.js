/**
 * Accounting Audit Routes
 * Global audit trail for all journal entry actions
 */

const express = require('express');
const router = express.Router();
const { AsientoAudit, Asiento } = require('../../models/accounting');
const { Op } = require('sequelize');
const { accountingDb } = require('../../config/database');
const User = require('../../models/User');

/**
 * GET / - List all audit entries with filters and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      usuario_id,
      accion,
      id_asiento,
      desde,
      hasta,
      buscar
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (usuario_id) where.usuario_id = parseInt(usuario_id);
    if (accion) where.accion = accion;
    if (id_asiento) where.id_asiento = parseInt(id_asiento);

    if (desde || hasta) {
      where.timestamp = {};
      if (desde) where.timestamp[Op.gte] = new Date(desde);
      if (hasta) {
        const hastaDate = new Date(hasta);
        hastaDate.setHours(23, 59, 59, 999);
        where.timestamp[Op.lte] = hastaDate;
      }
    }

    if (buscar) {
      where[Op.or] = [
        { accion: { [Op.like]: `%${buscar}%` } }
      ];
    }

    const { count, rows } = await AsientoAudit.findAndCountAll({
      where,
      order: [['timestamp', 'DESC'], ['id_audit', 'DESC']],
      limit: limitNum,
      offset
    });

    // Resolve user names and asiento references
    const userIds = [...new Set(rows.map(r => r.usuario_id).filter(Boolean))];
    const asientoIds = [...new Set(rows.map(r => r.id_asiento).filter(Boolean))];

    let userMap = {};
    if (userIds.length > 0) {
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username', 'nombre', 'apellido'],
        raw: true
      });
      for (const u of users) userMap[u.id] = u;
    }

    let asientoMap = {};
    if (asientoIds.length > 0) {
      const asientos = await Asiento.unscoped().findAll({
        where: { id_asiento: asientoIds },
        attributes: ['id_asiento', 'nro_comprobante', 'concepto', 'fecha', 'estado'],
        raw: true
      });
      for (const a of asientos) asientoMap[a.id_asiento] = a;
    }

    const data = rows.map(entry => ({
      ...entry.toJSON(),
      usuario: userMap[entry.usuario_id] || null,
      asiento: asientoMap[entry.id_asiento] || null
    }));

    res.json({
      success: true,
      data,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching accounting audit:', error);
    res.status(500).json({ success: false, error: 'Error al obtener auditoría contable' });
  }
});

/**
 * GET /stats - Audit statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [actionCounts] = await accountingDb.query(`
      SELECT accion, COUNT(*) as total
      FROM asiento_audit
      GROUP BY accion
      ORDER BY total DESC
    `);

    const [recentActivity] = await accountingDb.query(`
      SELECT DATE(timestamp) as fecha, COUNT(*) as total
      FROM asiento_audit
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(timestamp)
      ORDER BY fecha DESC
    `);

    const totalCount = await AsientoAudit.count();

    res.json({
      success: true,
      data: {
        total: totalCount,
        porAccion: actionCounts,
        actividadReciente: recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching accounting audit stats:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas de auditoría' });
  }
});

/**
 * GET /filters - Available filter values
 */
router.get('/filters', async (req, res) => {
  try {
    const [acciones] = await accountingDb.query(`
      SELECT DISTINCT accion FROM asiento_audit ORDER BY accion
    `);

    // Get users who have audit entries
    const [userIds] = await accountingDb.query(`
      SELECT DISTINCT usuario_id FROM asiento_audit
    `);

    let usuarios = [];
    if (userIds.length > 0) {
      usuarios = await User.findAll({
        where: { id: userIds.map(u => u.usuario_id) },
        attributes: ['id', 'username', 'nombre', 'apellido'],
        order: [['username', 'ASC']],
        raw: true
      });
    }

    res.json({
      success: true,
      data: {
        acciones: acciones.map(a => a.accion),
        usuarios
      }
    });
  } catch (error) {
    console.error('Error fetching accounting audit filters:', error);
    res.status(500).json({ success: false, error: 'Error al obtener filtros de auditoría' });
  }
});

module.exports = router;
