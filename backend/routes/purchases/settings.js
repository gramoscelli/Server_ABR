/**
 * Purchase Settings Routes
 * Configuration for purchase module
 */

const express = require('express');
const router = express.Router();
const { PurchaseSettings } = require('../../models/purchases');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

/**
 * @route   GET /api/purchases/settings
 * @desc    Get all purchase settings
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const settings = await PurchaseSettings.findAll();

    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.setting_key] = {
        value: s.setting_value,
        description: s.description
      };
    });

    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    console.error('Error fetching purchase settings:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener configuración',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/purchases/settings/:key
 * @desc    Get single setting by key
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/:key', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const setting = await PurchaseSettings.findOne({
      where: { setting_key: req.params.key }
    });

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Configuración no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        key: setting.setting_key,
        value: setting.setting_value,
        description: setting.description
      }
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener configuración',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/purchases/settings/:key
 * @desc    Update setting
 * @access  Private (root, board_member)
 */
router.put('/:key', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  try {
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'El valor es requerido'
      });
    }

    const [setting, created] = await PurchaseSettings.upsert({
      setting_key: req.params.key,
      setting_value: String(value),
      description: description
    });

    res.json({
      success: true,
      message: created ? 'Configuración creada' : 'Configuración actualizada',
      data: {
        key: req.params.key,
        value: String(value),
        description
      }
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar configuración',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/purchases/settings
 * @desc    Update multiple settings at once
 * @access  Private (root, board_member)
 */
router.put('/', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required'
      });
    }

    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      await PurchaseSettings.upsert({
        setting_key: key,
        setting_value: String(value)
      });
      updates.push(key);
    }

    res.json({
      success: true,
      message: `${updates.length} configuraciones actualizadas`,
      updated: updates
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar configuraciones',
      message: error.message
    });
  }
});

module.exports = router;
