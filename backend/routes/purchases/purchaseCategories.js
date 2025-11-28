/**
 * Purchase Categories Routes
 * CRUD operations for purchase request categories
 */

const express = require('express');
const router = express.Router();
const { PurchaseCategory, PurchaseRequest } = require('../../models/purchases');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { fixEncoding } = require('../../utils/encoding');

/**
 * @route   GET /api/purchases/categories
 * @desc    Get all purchase categories
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const { is_active } = req.query;

    const where = {};
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const categories = await PurchaseCategory.findAll({
      where,
      order: [['order_index', 'ASC'], ['name', 'ASC']],
      include: [{
        model: PurchaseCategory,
        as: 'subcategories',
        required: false
      }]
    });

    const result = categories
      .filter(cat => !cat.parent_id) // Only root categories
      .map(cat => {
        const fixed = cat.toJSON();
        fixed.name = fixEncoding(fixed.name);
        return fixed;
      });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching purchase categories:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener categorías de compras',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/categories
 * @desc    Create purchase category
 * @access  Private (root, board_member)
 */
router.post('/', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  try {
    const { name, parent_id, color, expense_category_id, order_index } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
    }

    const category = await PurchaseCategory.create({
      name,
      parent_id,
      color: color || '#6B7280',
      expense_category_id,
      order_index: order_index || 0
    });

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error creating purchase category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear categoría',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/purchases/categories/:id
 * @desc    Update purchase category
 * @access  Private (root, board_member)
 */
router.put('/:id', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  try {
    const category = await PurchaseCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    const { name, parent_id, color, expense_category_id, order_index, is_active } = req.body;

    await category.update({
      name: name ?? category.name,
      parent_id: parent_id ?? category.parent_id,
      color: color ?? category.color,
      expense_category_id: expense_category_id ?? category.expense_category_id,
      order_index: order_index ?? category.order_index,
      is_active: is_active ?? category.is_active
    });

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error updating purchase category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar categoría',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/purchases/categories/:id
 * @desc    Delete purchase category
 * @access  Private (root)
 */
router.delete('/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const category = await PurchaseCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting purchase category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar categoría',
      message: error.message
    });
  }
});

module.exports = router;
