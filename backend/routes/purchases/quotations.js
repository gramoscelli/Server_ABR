/**
 * Quotations Routes
 * CRUD operations for quotations from suppliers
 */

const express = require('express');
const router = express.Router();
const {
  Quotation,
  QuotationItem,
  QuotationRequest,
  RfqSupplier,
  PurchaseRequest,
  Supplier,
  accountingDb
} = require('../../models/purchases');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { fixEncoding } = require('../../utils/encoding');
const { PurchaseRequestItem } = require('../../models/purchases');

// Fix encoding for quotation data
function fixQuotationEncoding(quotation) {
  if (!quotation) return quotation;
  const fixed = quotation.toJSON ? quotation.toJSON() : { ...quotation };
  if (fixed.notes) fixed.notes = fixEncoding(fixed.notes);
  if (fixed.payment_terms) fixed.payment_terms = fixEncoding(fixed.payment_terms);
  if (fixed.delivery_time) fixed.delivery_time = fixEncoding(fixed.delivery_time);
  if (fixed.supplier?.business_name) fixed.supplier.business_name = fixEncoding(fixed.supplier.business_name);
  if (fixed.purchaseRequest?.title) fixed.purchaseRequest.title = fixEncoding(fixed.purchaseRequest.title);
  if (fixed.purchaseRequest?.description) fixed.purchaseRequest.description = fixEncoding(fixed.purchaseRequest.description);
  if (fixed.purchaseRequest?.items) {
    fixed.purchaseRequest.items = fixed.purchaseRequest.items.map(item => ({
      ...item,
      description: fixEncoding(item.description),
      specifications: item.specifications ? fixEncoding(item.specifications) : null
    }));
  }
  if (fixed.items) {
    fixed.items = fixed.items.map(item => ({
      ...item,
      description: fixEncoding(item.description),
      notes: item.notes ? fixEncoding(item.notes) : null
    }));
  }
  return fixed;
}

/**
 * @route   GET /api/purchases/quotations
 * @desc    Get all quotations with filters
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const {
      purchase_request_id,
      supplier_id,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};
    if (purchase_request_id) where.purchase_request_id = purchase_request_id;
    if (supplier_id) where.supplier_id = supplier_id;
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: quotations } = await Quotation.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'business_name', 'cuit'] },
        {
          model: PurchaseRequest,
          as: 'purchaseRequest',
          attributes: ['id', 'request_number', 'title', 'description', 'estimated_amount'],
          include: [
            { model: PurchaseRequestItem, as: 'items', required: false }
          ]
        },
        { model: QuotationItem, as: 'items', required: false }
      ],
      order: [['received_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Apply encoding fix
    const fixedQuotations = quotations.map(fixQuotationEncoding);

    res.json({
      success: true,
      data: fixedQuotations,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cotizaciones',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/purchases/quotations/compare/:purchase_request_id
 * @desc    Get quotation comparison for a purchase request
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/compare/:purchase_request_id', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const quotations = await Quotation.findAll({
      where: { purchase_request_id: req.params.purchase_request_id },
      include: [
        { model: Supplier, as: 'supplier' },
        { model: QuotationItem, as: 'items', order: [['order_index', 'ASC']] }
      ],
      order: [['total_amount', 'ASC']]
    });

    if (quotations.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No hay cotizaciones para esta solicitud'
      });
    }

    // Calculate comparison data
    const amounts = quotations.map(q => parseFloat(q.total_amount));
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    const comparison = quotations.map(q => {
      const fixed = fixQuotationEncoding(q);
      return {
        ...fixed,
        difference_from_min: (parseFloat(q.total_amount) - minAmount).toFixed(2),
        percentage_above_min: minAmount > 0 ? (((parseFloat(q.total_amount) - minAmount) / minAmount) * 100).toFixed(1) : 0,
        is_lowest: parseFloat(q.total_amount) === minAmount
      };
    });

    res.json({
      success: true,
      data: comparison,
      summary: {
        count: quotations.length,
        minAmount: minAmount.toFixed(2),
        maxAmount: maxAmount.toFixed(2),
        avgAmount: avgAmount.toFixed(2),
        spread: (maxAmount - minAmount).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error comparing quotations:', error);
    res.status(500).json({
      success: false,
      error: 'Error al comparar cotizaciones',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/purchases/quotations/:id
 * @desc    Get single quotation
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/:id', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const quotation = await Quotation.findByPk(req.params.id, {
      include: [
        { model: Supplier, as: 'supplier' },
        {
          model: PurchaseRequest,
          as: 'purchaseRequest',
          include: [
            { model: PurchaseRequestItem, as: 'items', required: false }
          ]
        },
        { model: QuotationRequest, as: 'quotationRequest' },
        { model: QuotationItem, as: 'items', order: [['order_index', 'ASC']] }
      ]
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        error: 'Cotización no encontrada'
      });
    }

    res.json({
      success: true,
      data: fixQuotationEncoding(quotation)
    });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cotización',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/quotations
 * @desc    Register new quotation from supplier
 * @access  Private (root, board_member, admin_employee)
 */
router.post('/', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const {
      quotation_number,
      quotation_request_id,
      purchase_request_id,
      supplier_id,
      subtotal,
      tax_amount,
      total_amount,
      payment_terms,
      delivery_time,
      valid_until,
      attachment_url,
      notes,
      received_at,
      items
    } = req.body;

    // Validation
    if (!purchase_request_id || !supplier_id || !total_amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Solicitud, proveedor y monto total son requeridos'
      });
    }

    const quotation = await Quotation.create({
      quotation_number,
      quotation_request_id,
      purchase_request_id,
      supplier_id,
      subtotal: subtotal || total_amount,
      tax_amount: tax_amount || 0,
      total_amount,
      payment_terms,
      delivery_time,
      valid_until,
      status: 'received',
      attachment_url,
      notes,
      received_by: req.user.id,
      received_at: received_at || new Date()
    }, { transaction });

    // Create items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const itemsToCreate = items.map((item, index) => ({
        quotation_id: quotation.id,
        request_item_id: item.request_item_id,
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || 'unidad',
        unit_price: item.unit_price,
        notes: item.notes,
        order_index: index
      }));
      await QuotationItem.bulkCreate(itemsToCreate, { transaction });
    }

    // Update RFQ supplier as responded if applicable
    if (quotation_request_id) {
      await RfqSupplier.update(
        { responded: true },
        { where: { quotation_request_id, supplier_id }, transaction }
      );
    }

    // Update purchase request status
    await PurchaseRequest.update(
      { status: 'quotation_received' },
      { where: { id: purchase_request_id }, transaction }
    );

    await transaction.commit();

    // Fetch complete quotation
    const fullQuotation = await Quotation.findByPk(quotation.id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: QuotationItem, as: 'items' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Cotización registrada exitosamente',
      data: fixQuotationEncoding(fullQuotation)
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating quotation:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar cotización',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/purchases/quotations/:id
 * @desc    Update quotation (allowed until order is created)
 * @access  Private (root, board_member, admin_employee)
 */
router.put('/:id', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const quotation = await Quotation.findByPk(req.params.id, {
      include: [{ model: PurchaseRequest, as: 'purchaseRequest' }],
      transaction
    });

    if (!quotation) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Cotización no encontrada'
      });
    }

    // Check if purchase request allows editing
    const request = quotation.purchaseRequest;
    if (request.status === 'order_created' || request.status === 'completed') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'No se puede editar la cotización porque la compra ya fue aprobada o completada'
      });
    }

    const {
      quotation_number,
      supplier_id,
      subtotal,
      tax_amount,
      total_amount,
      payment_terms,
      delivery_time,
      valid_until,
      attachment_url,
      notes,
      items
    } = req.body;

    // Update quotation
    await quotation.update({
      quotation_number: quotation_number ?? quotation.quotation_number,
      supplier_id: supplier_id ?? quotation.supplier_id,
      subtotal: subtotal ?? quotation.subtotal,
      tax_amount: tax_amount ?? quotation.tax_amount,
      total_amount: total_amount ?? quotation.total_amount,
      payment_terms: payment_terms ?? quotation.payment_terms,
      delivery_time: delivery_time ?? quotation.delivery_time,
      valid_until: valid_until ?? quotation.valid_until,
      attachment_url: attachment_url ?? quotation.attachment_url,
      notes: notes ?? quotation.notes
    }, { transaction });

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await QuotationItem.destroy({
        where: { quotation_id: quotation.id },
        transaction
      });

      // Create new items
      if (items.length > 0) {
        const itemsToCreate = items.map((item, index) => ({
          quotation_id: quotation.id,
          request_item_id: item.request_item_id,
          description: item.description,
          quantity: item.quantity || 1,
          unit: item.unit || 'unidad',
          unit_price: item.unit_price,
          notes: item.notes,
          order_index: index
        }));
        await QuotationItem.bulkCreate(itemsToCreate, { transaction });
      }
    }

    await transaction.commit();

    // Fetch updated quotation
    const fullQuotation = await Quotation.findByPk(quotation.id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: QuotationItem, as: 'items' }
      ]
    });

    res.json({
      success: true,
      message: 'Cotización actualizada exitosamente',
      data: fixQuotationEncoding(fullQuotation)
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating quotation:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar cotización',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/quotations/:id/select
 * @desc    Select winning quotation
 * @access  Private (root, board_member)
 */
router.post('/:id/select', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const { selection_reason } = req.body;
    const quotation = await Quotation.findByPk(req.params.id, { transaction });

    if (!quotation) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Cotización no encontrada'
      });
    }

    // Reject other quotations for same request
    await Quotation.update(
      { status: 'rejected', is_selected: false },
      {
        where: {
          purchase_request_id: quotation.purchase_request_id,
          id: { [Op.ne]: quotation.id }
        },
        transaction
      }
    );

    // Mark this quotation as selected
    await quotation.update({
      is_selected: true,
      status: 'selected',
      selection_reason
    }, { transaction });

    // Update purchase request status
    await PurchaseRequest.update(
      { status: 'in_evaluation' },
      { where: { id: quotation.purchase_request_id }, transaction }
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Cotización seleccionada exitosamente',
      data: { id: quotation.id, status: 'selected' }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error selecting quotation:', error);
    res.status(500).json({
      success: false,
      error: 'Error al seleccionar cotización',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/purchases/quotations/:id
 * @desc    Delete quotation
 * @access  Private (root, board_member)
 */
router.delete('/:id', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  try {
    const quotation = await Quotation.findByPk(req.params.id, {
      include: [{ model: PurchaseRequest, as: 'purchaseRequest' }]
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        error: 'Cotización no encontrada'
      });
    }

    if (quotation.is_selected) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una cotización seleccionada'
      });
    }

    // Check if purchase request already has an order created
    const request = quotation.purchaseRequest;
    if (request.status === 'order_created' || request.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'No se pueden eliminar cotizaciones una vez creada la orden de compra'
      });
    }

    await quotation.destroy();

    res.json({
      success: true,
      message: 'Cotización eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar cotización',
      message: error.message
    });
  }
});

module.exports = router;
