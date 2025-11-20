/**
 * Transfer Types Routes
 * CRUD operations for transfer types
 */

const express = require('express');
const router = express.Router();
const { TransferType } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

/**
 * @route   GET /api/accounting/transfer-types
 * @desc    Get all transfer types
 * @access  Private (root, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const types = await TransferType.findAll({
      order: [['order_index', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Error fetching transfer types:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tipos de transferencia',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/accounting/transfer-types/:id
 * @desc    Get single transfer type
 * @access  Private (root, admin_employee)
 */
router.get('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const type = await TransferType.findByPk(req.params.id);

    if (!type) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de transferencia no encontrado'
      });
    }

    res.json({
      success: true,
      data: type
    });
  } catch (error) {
    console.error('Error fetching transfer type:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tipo de transferencia',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/accounting/transfer-types
 * @desc    Create new transfer type
 * @access  Private (root, admin_employee)
 */
router.post('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { name, color, description, order_index } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
    }

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({
        success: false,
        error: 'El formato del color debe ser #RRGGBB'
      });
    }

    const type = await TransferType.create({
      name,
      color: color || '#3B82F6',
      description: description || null,
      order_index: order_index || 0
    });

    res.status(201).json({
      success: true,
      message: 'Tipo de transferencia creado exitosamente',
      data: type
    });
  } catch (error) {
    console.error('Error creating transfer type:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear tipo de transferencia',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/accounting/transfer-types/:id
 * @desc    Update transfer type
 * @access  Private (root, admin_employee)
 */
router.put('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const type = await TransferType.findByPk(req.params.id);

    if (!type) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de transferencia no encontrado'
      });
    }

    const { name, color, description, order_index } = req.body;

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({
        success: false,
        error: 'El formato del color debe ser #RRGGBB'
      });
    }

    if (name !== undefined) type.name = name;
    if (color !== undefined) type.color = color;
    if (description !== undefined) type.description = description;
    if (order_index !== undefined) type.order_index = order_index;

    await type.save();

    res.json({
      success: true,
      message: 'Tipo de transferencia actualizado exitosamente',
      data: type
    });
  } catch (error) {
    console.error('Error updating transfer type:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar tipo de transferencia',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/accounting/transfer-types/:id
 * @desc    Delete transfer type
 * @access  Private (root)
 */
router.delete('/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const type = await TransferType.findByPk(req.params.id);

    if (!type) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de transferencia no encontrado'
      });
    }

    await type.destroy();

    res.json({
      success: true,
      message: 'Tipo de transferencia eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting transfer type:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar tipo de transferencia',
      message: error.message
    });
  }
});

module.exports = router;
