/**
 * Supplier Categories Routes
 * CRUD operations for supplier categories
 */

const express = require('express');
const router = express.Router();
const { SupplierCategory, Supplier } = require('../../models/purchases');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { fixEncoding } = require('../../utils/encoding');

/**
 * @route   GET /api/purchases/supplier-categories
 * @desc    Get all supplier categories
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const { is_active } = req.query;

    const where = {};
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const categories = await SupplierCategory.findAll({
      where,
      order: [['order_index', 'ASC'], ['name', 'ASC']],
      include: [{
        model: Supplier,
        as: 'suppliers',
        attributes: ['id'],
        required: false
      }]
    });

    const result = categories.map(cat => {
      const fixed = cat.toJSON();
      fixed.name = fixEncoding(fixed.name);
      fixed.description = fixed.description ? fixEncoding(fixed.description) : null;
      fixed.supplier_count = fixed.suppliers?.length || 0;
      delete fixed.suppliers;
      return fixed;
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching supplier categories:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener categorías de proveedores',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/supplier-categories
 * @desc    Create supplier category
 * @access  Private (root, board_member)
 */
router.post('/', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  try {
    const { name, description, color, order_index } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
    }

    const category = await SupplierCategory.create({
      name,
      description,
      color: color || '#6B7280',
      order_index: order_index || 0
    });

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error creating supplier category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear categoría',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/purchases/supplier-categories/:id
 * @desc    Update supplier category
 * @access  Private (root, board_member)
 */
router.put('/:id', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  try {
    const category = await SupplierCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    const { name, description, color, order_index, is_active } = req.body;

    await category.update({
      name: name ?? category.name,
      description: description ?? category.description,
      color: color ?? category.color,
      order_index: order_index ?? category.order_index,
      is_active: is_active ?? category.is_active
    });

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error updating supplier category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar categoría',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/purchases/supplier-categories/:id
 * @desc    Delete supplier category
 * @access  Private (root)
 */
router.delete('/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const category = await SupplierCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    // Check for associated suppliers
    const supplierCount = await Supplier.count({ where: { category_id: req.params.id } });
    if (supplierCount > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede eliminar: hay ${supplierCount} proveedores asociados`
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting supplier category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar categoría',
      message: error.message
    });
  }
});

module.exports = router;
