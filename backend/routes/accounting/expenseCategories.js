/**
 * Expense Categories Routes
 * CRUD operations for expense categories
 */

const express = require('express');
const router = express.Router();
const { ExpenseCategory } = require('../../models/accounting');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { fixEncoding } = require('../../utils/encoding');

// Fix encoding for category data
function fixCategoryEncoding(category) {
  if (!category) return category;
  const fixed = category.toJSON ? category.toJSON() : { ...category };
  if (fixed.name) fixed.name = fixEncoding(fixed.name);
  if (fixed.description) fixed.description = fixEncoding(fixed.description);
  if (fixed.subcategories) {
    fixed.subcategories = fixed.subcategories.map(sub => fixCategoryEncoding(sub));
  }
  if (fixed.parent?.name) fixed.parent.name = fixEncoding(fixed.parent.name);
  return fixed;
}

/**
 * @route   GET /api/accounting/expense-categories
 * @desc    Get all expense categories with hierarchy
 * @access  Private (root, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const categories = await ExpenseCategory.findAll({
      include: [{
        model: ExpenseCategory,
        as: 'subcategories',
        required: false
      }, {
        model: ExpenseCategory,
        as: 'parent',
        required: false
      }],
      order: [['order_index', 'ASC'], ['name', 'ASC']]
    });

    // Organize into hierarchy and fix encoding
    const rootCategories = categories.filter(cat => !cat.parent_id);
    const result = rootCategories.map(parent => {
      const fixed = fixCategoryEncoding(parent);
      fixed.subcategories = categories
        .filter(cat => cat.parent_id === parent.id)
        .map(fixCategoryEncoding);
      return fixed;
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener categorías de egresos',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/accounting/expense-categories/:id
 * @desc    Get single expense category
 * @access  Private (root, admin_employee)
 */
router.get('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const category = await ExpenseCategory.findByPk(req.params.id, {
      include: [{
        model: ExpenseCategory,
        as: 'subcategories'
      }, {
        model: ExpenseCategory,
        as: 'parent'
      }]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching expense category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener categoría',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/accounting/expense-categories
 * @desc    Create new expense category
 * @access  Private (root, admin_employee)
 */
router.post('/', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { name, parent_id, color, budget, is_featured, order_index } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
    }

    // Validate color format
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({
        success: false,
        error: 'El formato del color debe ser #RRGGBB'
      });
    }

    // Validate parent exists if provided
    if (parent_id) {
      const parentExists = await ExpenseCategory.findByPk(parent_id);
      if (!parentExists) {
        return res.status(404).json({
          success: false,
          error: 'Categoría padre no encontrada'
        });
      }
    }

    const category = await ExpenseCategory.create({
      name,
      parent_id: parent_id || null,
      color: color || '#6B7280',
      budget: budget || null,
      is_featured: is_featured || false,
      order_index: order_index || 0
    });

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error creating expense category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear categoría',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/accounting/expense-categories/:id
 * @desc    Update expense category
 * @access  Private (root, admin_employee)
 */
router.put('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const category = await ExpenseCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    const { name, parent_id, color, budget, is_featured, order_index } = req.body;

    // Validate color format
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({
        success: false,
        error: 'El formato del color debe ser #RRGGBB'
      });
    }

    // Prevent setting self as parent
    if (parent_id && parseInt(parent_id) === parseInt(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Una categoría no puede ser su propia categoría padre'
      });
    }

    // Validate parent exists if provided
    if (parent_id) {
      const parentExists = await ExpenseCategory.findByPk(parent_id);
      if (!parentExists) {
        return res.status(404).json({
          success: false,
          error: 'Categoría padre no encontrada'
        });
      }
    }

    // Update fields
    if (name !== undefined) category.name = name;
    if (parent_id !== undefined) category.parent_id = parent_id || null;
    if (color !== undefined) category.color = color;
    if (budget !== undefined) category.budget = budget;
    if (is_featured !== undefined) category.is_featured = is_featured;
    if (order_index !== undefined) category.order_index = order_index;

    await category.save();

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: category
    });
  } catch (error) {
    console.error('Error updating expense category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar categoría',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/accounting/expense-categories/:id
 * @desc    Delete expense category
 * @access  Private (root)
 */
router.delete('/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const category = await ExpenseCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    // Check if category has subcategories
    const subcategories = await ExpenseCategory.count({
      where: { parent_id: req.params.id }
    });

    if (subcategories > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una categoría con subcategorías. Elimine primero las subcategorías.'
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting expense category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar categoría',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/accounting/expense-categories/reorder
 * @desc    Reorder categories
 * @access  Private (root, admin_employee)
 */
router.put('/reorder', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de categorías'
      });
    }

    // Update order_index for each category
    const updates = categories.map((cat, index) =>
      ExpenseCategory.update(
        { order_index: index },
        { where: { id: cat.id } }
      )
    );

    await Promise.all(updates);

    res.json({
      success: true,
      message: 'Categorías reordenadas exitosamente'
    });
  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({
      success: false,
      error: 'Error al reordenar categorías',
      message: error.message
    });
  }
});

module.exports = router;
