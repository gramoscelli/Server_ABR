/**
 * Suppliers Routes
 * CRUD operations for suppliers/vendors
 */

const express = require('express');
const router = express.Router();
const {
  Supplier,
  SupplierCategory,
  accountingDb
} = require('../../models/purchases');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { fixEncoding } = require('../../utils/encoding');

// Fix encoding for supplier data
function fixSupplierEncoding(supplier) {
  if (!supplier) return supplier;
  const fixed = supplier.toJSON ? supplier.toJSON() : { ...supplier };
  if (fixed.business_name) fixed.business_name = fixEncoding(fixed.business_name);
  if (fixed.trade_name) fixed.trade_name = fixEncoding(fixed.trade_name);
  if (fixed.contact_name) fixed.contact_name = fixEncoding(fixed.contact_name);
  if (fixed.address) fixed.address = fixEncoding(fixed.address);
  if (fixed.notes) fixed.notes = fixEncoding(fixed.notes);
  if (fixed.category?.name) fixed.category.name = fixEncoding(fixed.category.name);
  return fixed;
}

/**
 * @route   GET /api/purchases/suppliers
 * @desc    Get all suppliers with filters
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const {
      search,
      category_id,
      is_active,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { business_name: { [Op.like]: `%${search}%` } },
        { trade_name: { [Op.like]: `%${search}%` } },
        { cuit: { [Op.like]: `%${search}%` } },
        { contact_name: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category_id) where.category_id = category_id;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: suppliers } = await Supplier.findAndCountAll({
      where,
      include: [
        {
          model: SupplierCategory,
          as: 'category',
          required: false
        }
      ],
      order: [['business_name', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    const fixedSuppliers = suppliers.map(fixSupplierEncoding);

    res.json({
      success: true,
      data: fixedSuppliers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener proveedores',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/purchases/suppliers/:id
 * @desc    Get single supplier
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/:id', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id, {
      include: [
        {
          model: SupplierCategory,
          as: 'category'
        }
      ]
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Proveedor no encontrado'
      });
    }

    res.json({
      success: true,
      data: fixSupplierEncoding(supplier)
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener proveedor',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/suppliers
 * @desc    Create new supplier
 * @access  Private (root, board_member, admin_employee)
 */
router.post('/', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const {
      business_name,
      trade_name,
      cuit,
      tax_condition,
      category_id,
      contact_name,
      email,
      phone,
      mobile,
      address,
      city,
      province,
      postal_code,
      website,
      bank_name,
      bank_account_type,
      bank_account_number,
      bank_cbu,
      bank_alias,
      payment_terms,
      notes
    } = req.body;

    if (!business_name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre/razón social es requerido'
      });
    }

    // Check for duplicate CUIT
    if (cuit) {
      const existing = await Supplier.findOne({ where: { cuit } });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un proveedor con ese CUIT'
        });
      }
    }

    const supplier = await Supplier.create({
      business_name,
      trade_name,
      cuit,
      tax_condition,
      category_id,
      contact_name,
      email,
      phone,
      mobile,
      address,
      city,
      province,
      postal_code,
      website,
      bank_name,
      bank_account_type,
      bank_account_number,
      bank_cbu,
      bank_alias,
      payment_terms,
      notes,
      created_by: req.user.id
    });

    // Fetch with associations
    const fullSupplier = await Supplier.findByPk(supplier.id, {
      include: [{ model: SupplierCategory, as: 'category' }]
    });

    res.status(201).json({
      success: true,
      message: 'Proveedor creado exitosamente',
      data: fixSupplierEncoding(fullSupplier)
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear proveedor',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/purchases/suppliers/:id
 * @desc    Update supplier
 * @access  Private (root, board_member, admin_employee)
 */
router.put('/:id', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Proveedor no encontrado'
      });
    }

    const {
      business_name,
      trade_name,
      cuit,
      tax_condition,
      category_id,
      contact_name,
      email,
      phone,
      mobile,
      address,
      city,
      province,
      postal_code,
      website,
      bank_name,
      bank_account_type,
      bank_account_number,
      bank_cbu,
      bank_alias,
      payment_terms,
      notes,
      rating,
      is_active
    } = req.body;

    // Check for duplicate CUIT (excluding current)
    if (cuit && cuit !== supplier.cuit) {
      const existing = await Supplier.findOne({
        where: { cuit, id: { [Op.ne]: req.params.id } }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un proveedor con ese CUIT'
        });
      }
    }

    await supplier.update({
      business_name: business_name ?? supplier.business_name,
      trade_name: trade_name ?? supplier.trade_name,
      cuit: cuit ?? supplier.cuit,
      tax_condition: tax_condition ?? supplier.tax_condition,
      category_id: category_id ?? supplier.category_id,
      contact_name: contact_name ?? supplier.contact_name,
      email: email ?? supplier.email,
      phone: phone ?? supplier.phone,
      mobile: mobile ?? supplier.mobile,
      address: address ?? supplier.address,
      city: city ?? supplier.city,
      province: province ?? supplier.province,
      postal_code: postal_code ?? supplier.postal_code,
      website: website ?? supplier.website,
      bank_name: bank_name ?? supplier.bank_name,
      bank_account_type: bank_account_type ?? supplier.bank_account_type,
      bank_account_number: bank_account_number ?? supplier.bank_account_number,
      bank_cbu: bank_cbu ?? supplier.bank_cbu,
      bank_alias: bank_alias ?? supplier.bank_alias,
      payment_terms: payment_terms ?? supplier.payment_terms,
      notes: notes ?? supplier.notes,
      rating: rating ?? supplier.rating,
      is_active: is_active ?? supplier.is_active
    });

    // Fetch with associations
    const fullSupplier = await Supplier.findByPk(supplier.id, {
      include: [{ model: SupplierCategory, as: 'category' }]
    });

    res.json({
      success: true,
      message: 'Proveedor actualizado exitosamente',
      data: fixSupplierEncoding(fullSupplier)
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar proveedor',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/purchases/suppliers/:id
 * @desc    Delete supplier
 * @access  Private (root, board_member)
 */
router.delete('/:id', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Proveedor no encontrado'
      });
    }

    await supplier.destroy();

    res.json({
      success: true,
      message: 'Proveedor eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);

    // Check for foreign key constraint
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar el proveedor porque tiene órdenes de compra asociadas'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al eliminar proveedor',
      message: error.message
    });
  }
});

module.exports = router;
