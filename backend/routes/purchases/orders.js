/**
 * Purchase Orders Routes
 * CRUD operations for purchase orders
 */

const express = require('express');
const router = express.Router();
const {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseRequest,
  Quotation,
  Supplier,
  accountingDb
} = require('../../models/purchases');
const { CuentaContable, Asiento, AsientoDetalle } = require('../../models/accounting');
const asientoService = require('../../services/asientoService');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { fixEncoding } = require('../../utils/encoding');

// Fix encoding for order data
function fixOrderEncoding(order) {
  if (!order) return order;
  const fixed = order.toJSON ? order.toJSON() : { ...order };
  if (fixed.notes) fixed.notes = fixEncoding(fixed.notes);
  if (fixed.delivery_notes) fixed.delivery_notes = fixEncoding(fixed.delivery_notes);
  if (fixed.supplier?.business_name) fixed.supplier.business_name = fixEncoding(fixed.supplier.business_name);
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
 * @route   GET /api/purchases/orders
 * @desc    Get all purchase orders with filters
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const {
      status,
      supplier_id,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};

    if (status) where.status = status;
    if (supplier_id) where.supplier_id = supplier_id;

    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date);
      if (end_date) where.created_at[Op.lte] = new Date(end_date + 'T23:59:59');
    }

    if (search) {
      where[Op.or] = [
        { order_number: { [Op.like]: `%${search}%` } },
        { invoice_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: orders } = await PurchaseOrder.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'business_name', 'cuit'] },
        { model: PurchaseRequest, as: 'purchaseRequest', attributes: ['id', 'request_number', 'title'] },
        { model: PurchaseOrderItem, as: 'items', required: false }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const fixedOrders = orders.map(fixOrderEncoding);

    const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

    res.json({
      success: true,
      data: fixedOrders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      },
      summary: {
        totalAmount: totalAmount.toFixed(2),
        count: orders.length
      }
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener órdenes de compra',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/purchases/orders/:id
 * @desc    Get single purchase order
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/:id', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseRequest, as: 'purchaseRequest' },
        { model: Quotation, as: 'quotation' },
        { model: CuentaContable, as: 'cuenta' },
        { model: PurchaseOrderItem, as: 'items', order: [['order_index', 'ASC']] }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Orden de compra no encontrada'
      });
    }

    res.json({
      success: true,
      data: fixOrderEncoding(order)
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener orden de compra',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/orders
 * @desc    Create purchase order from approved request
 * @access  Private (root, board_member, admin_employee)
 */
router.post('/', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const {
      purchase_request_id,
      quotation_id,
      supplier_id,
      subtotal,
      tax_amount,
      total_amount,
      payment_terms,
      expected_delivery_date,
      delivery_address,
      delivery_notes,
      notes,
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

    // Verify request is approved
    const request = await PurchaseRequest.findByPk(purchase_request_id, { transaction });
    if (!request || !['approved', 'in_quotation', 'quotation_received', 'in_evaluation'].includes(request.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'La solicitud debe estar aprobada para crear una orden'
      });
    }

    // Generate order number
    const order_number = await PurchaseOrder.generateOrderNumber();

    // Create order
    const order = await PurchaseOrder.create({
      order_number,
      purchase_request_id,
      quotation_id,
      supplier_id,
      subtotal: subtotal || total_amount,
      tax_amount: tax_amount || 0,
      total_amount,
      currency: request.currency,
      payment_terms,
      status: 'draft',
      expected_delivery_date,
      delivery_address,
      delivery_notes,
      notes,
      created_by: req.user.id
    }, { transaction });

    // Create items
    if (items && Array.isArray(items) && items.length > 0) {
      const itemsToCreate = items.map((item, index) => ({
        order_id: order.id,
        quotation_item_id: item.quotation_item_id,
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || 'unidad',
        unit_price: item.unit_price,
        notes: item.notes,
        order_index: index
      }));
      await PurchaseOrderItem.bulkCreate(itemsToCreate, { transaction });
    }

    // Update request status
    await request.update({ status: 'order_created' }, { transaction });

    // Mark quotation as selected if provided
    if (quotation_id) {
      await Quotation.update(
        { is_selected: true, status: 'selected' },
        { where: { id: quotation_id }, transaction }
      );
    }

    await transaction.commit();

    // Fetch complete order
    const fullOrder = await PurchaseOrder.findByPk(order.id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseRequest, as: 'purchaseRequest' },
        { model: PurchaseOrderItem, as: 'items' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Orden de compra creada exitosamente',
      data: fixOrderEncoding(fullOrder)
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating purchase order:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear orden de compra',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/purchases/orders/:id/status
 * @desc    Update order status
 * @access  Private (root, board_member, admin_employee)
 */
router.put('/:id/status', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'sent', 'confirmed', 'partially_received', 'received', 'invoiced', 'paid', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido'
      });
    }

    const order = await PurchaseOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    await order.update({ status });

    // If received, update actual delivery date
    if (status === 'received' && !order.actual_delivery_date) {
      await order.update({ actual_delivery_date: new Date() });
    }

    res.json({
      success: true,
      message: 'Estado actualizado',
      data: { status }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estado',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/orders/:id/to-expense
 * @desc    Create expense from order (when invoiced)
 * @access  Private (root, board_member, admin_employee)
 */
router.post('/:id/to-expense', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const { id_cuenta_origen, id_cuenta_destino, invoice_number, invoice_date, invoice_attachment_url } = req.body;

    if (!id_cuenta_origen || !id_cuenta_destino) {
      return res.status(400).json({
        success: false,
        error: 'Las cuentas origen (pago) y destino (gasto) son requeridas'
      });
    }

    const order = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: Supplier, as: 'supplier' }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    if (order.id_asiento) {
      return res.status(400).json({
        success: false,
        error: 'Esta orden ya tiene un asiento asociado'
      });
    }

    // Create journal entry: debit expense account, credit payment account
    const result = await asientoService.createAsiento({
      fecha: invoice_date || new Date(),
      origen: 'compra',
      concepto: `OC ${order.order_number} - ${order.supplier?.business_name || 'Proveedor'}`,
      detalles: [
        { id_cuenta: id_cuenta_destino, tipo_mov: 'debe', importe: order.total_amount, referencia_operativa: invoice_number || null },
        { id_cuenta: id_cuenta_origen, tipo_mov: 'haber', importe: order.total_amount, referencia_operativa: `OC-${order.order_number}` }
      ],
      usuario_id: req.user.id,
      estado: 'confirmado'
    });

    // Update order
    await order.update({
      status: 'invoiced',
      id_asiento: result.asiento.id_asiento,
      id_cuenta: id_cuenta_origen,
      invoice_number,
      invoice_date,
      invoice_attachment_url
    });

    // Update purchase request to completed
    if (order.purchase_request_id) {
      await PurchaseRequest.update(
        { status: 'completed' },
        { where: { id: order.purchase_request_id } }
      );
    }

    res.json({
      success: true,
      message: 'Asiento contable creado exitosamente',
      data: {
        id_asiento: result.asiento.id_asiento,
        order_status: 'invoiced'
      }
    });
  } catch (error) {
    console.error('Error creating expense from order:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear asiento contable',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/purchases/orders/:id
 * @desc    Delete purchase order (only drafts)
 * @access  Private (root, board_member)
 */
router.delete('/:id', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    if (order.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden eliminar órdenes en estado borrador'
      });
    }

    await order.destroy();

    res.json({
      success: true,
      message: 'Orden eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar orden',
      message: error.message
    });
  }
});

module.exports = router;
