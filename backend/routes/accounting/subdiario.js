/**
 * Subdiario Routes
 * Manages sub-journal posting to the general journal (libro diario)
 */

const express = require('express');
const router = express.Router();
const { authorizeRoles } = require('../../middleware/auth');
const asientoService = require('../../services/asientoService');

// GET /pendientes - List dates with unposted subdiario entries
router.get('/pendientes', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { subdiario = 'caja' } = req.query;
    const pendientes = await asientoService.getPendientesPase(subdiario);
    res.json({ success: true, data: pendientes });
  } catch (error) {
    console.error('Error fetching pendientes:', error);
    res.status(500).json({ success: false, error: 'Error al obtener fechas pendientes' });
  }
});

// GET /preview - Preview the summary entry for a date range
router.get('/preview', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { fecha, fecha_hasta, subdiario = 'caja' } = req.query;
    if (!fecha) {
      return res.status(400).json({ success: false, error: 'La fecha inicial es obligatoria' });
    }
    const preview = await asientoService.previewPaseDiario(fecha, subdiario, fecha_hasta || null);
    res.json({ success: true, data: preview });
  } catch (error) {
    console.error('Error previewing pase:', error);
    res.status(500).json({ success: false, error: 'Error al generar preview del pase' });
  }
});

// POST /pase - Execute the pase al diario for a date range
router.post('/pase', authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { fecha, fecha_hasta, subdiario = 'caja' } = req.body;
    if (!fecha) {
      return res.status(400).json({ success: false, error: 'La fecha inicial es obligatoria' });
    }
    const result = await asientoService.generarPaseDiario(fecha, req.user.id, subdiario, fecha_hasta || null);
    res.status(201).json({
      success: true,
      data: result,
      message: `Pase al diario generado: ${result.asientosVinculados} movimientos consolidados`
    });
  } catch (error) {
    console.error('Error executing pase:', error);
    if (error.message.includes('No hay movimientos') || error.message.includes('al menos 2') || error.message.includes('no balancea')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Error al ejecutar pase al diario' });
  }
});

module.exports = router;
