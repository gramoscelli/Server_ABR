/**
 * Purchase Requests Routes
 * CRUD and workflow operations for purchase requests
 */

const express = require('express');
const router = express.Router();
const {
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseRequestHistory,
  PurchaseCategory,
  Supplier,
  PurchaseSettings,
  Quotation,
  accountingDb
} = require('../../models/purchases');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { fixEncoding } = require('../../utils/encoding');

// Fix encoding for request data
function fixRequestEncoding(request) {
  if (!request) return request;
  const fixed = request.toJSON ? request.toJSON() : { ...request };
  if (fixed.title) fixed.title = fixEncoding(fixed.title);
  if (fixed.description) fixed.description = fixEncoding(fixed.description);
  if (fixed.justification) fixed.justification = fixEncoding(fixed.justification);
  if (fixed.notes) fixed.notes = fixEncoding(fixed.notes);
  if (fixed.category?.name) fixed.category.name = fixEncoding(fixed.category.name);
  if (fixed.preferredSupplier?.business_name) {
    fixed.preferredSupplier.business_name = fixEncoding(fixed.preferredSupplier.business_name);
  }
  if (fixed.items) {
    fixed.items = fixed.items.map(item => ({
      ...item,
      description: fixEncoding(item.description),
      specifications: item.specifications ? fixEncoding(item.specifications) : null
    }));
  }
  return fixed;
}

/**
 * @route   GET /api/purchases/requests
 * @desc    Get all purchase requests with filters
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  // Import User model for querying user data
  const User = require('../../models/User');
  const { sequelize } = require('../../config/database');

  try {
    const {
      status,
      purchase_type,
      category_id,
      requested_by,
      start_date,
      end_date,
      priority,
      search,
      page = 1,
      limit = 50,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const where = {};

    if (status) where.status = status;
    if (purchase_type) where.purchase_type = purchase_type;
    if (category_id) where.category_id = category_id;
    if (requested_by) where.requested_by = requested_by;
    if (priority) where.priority = priority;

    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date);
      if (end_date) where.created_at[Op.lte] = new Date(end_date + 'T23:59:59');
    }

    if (search) {
      where[Op.or] = [
        { request_number: { [Op.like]: `%${search}%` } },
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Validate and map sort fields
    const validSortFields = {
      'request_number': 'request_number',
      'title': 'title',
      'purchase_type': 'purchase_type',
      'priority': 'priority',
      'status': 'status',
      'estimated_amount': 'estimated_amount',
      'created_at': 'created_at'
    };

    const sortField = validSortFields[sort_by] || 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: requests } = await PurchaseRequest.findAndCountAll({
      where,
      include: [
        { model: PurchaseCategory, as: 'category', required: false },
        { model: Supplier, as: 'preferredSupplier', required: false, attributes: ['id', 'business_name'] },
        { model: PurchaseRequestItem, as: 'items', required: false },
        {
          model: Quotation,
          as: 'quotations',
          required: false,
          attributes: ['id']
        }
      ],
      order: [[sortField, sortDirection]],
      limit: parseInt(limit),
      offset
    });

    // Get unique user IDs
    const userIds = new Set();
    requests.forEach(req => {
      if (req.requested_by) userIds.add(req.requested_by);
      if (req.approved_by) userIds.add(req.approved_by);
    });

    // Fetch user data from main database
    const users = await User.findAll({
      where: { id: Array.from(userIds) },
      attributes: ['id', 'username', 'nombre', 'apellido']
    });

    // Create user lookup map
    const userMap = {};
    users.forEach(user => {
      const fullName = [user.nombre, user.apellido].filter(Boolean).join(' ').trim() || null;
      userMap[user.id] = {
        id: user.id,
        username: user.username,
        full_name: fullName
      };
    });

    // Attach user data and quotation count to requests
    const requestsWithUsers = requests.map(req => {
      const reqData = req.toJSON ? req.toJSON() : req;
      return {
        ...reqData,
        requestedBy: reqData.requested_by ? userMap[reqData.requested_by] : null,
        approvedBy: reqData.approved_by ? userMap[reqData.approved_by] : null,
        quotations_count: reqData.quotations ? reqData.quotations.length : 0
      };
    });

    const fixedRequests = requestsWithUsers.map(fixRequestEncoding);

    // Calculate summary
    const totalEstimated = requests.reduce((sum, r) => sum + parseFloat(r.estimated_amount || 0), 0);

    res.json({
      success: true,
      data: fixedRequests,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      },
      summary: {
        totalEstimated: totalEstimated.toFixed(2),
        count: requests.length
      }
    });
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener solicitudes de compra',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/purchases/requests/pending-approval
 * @desc    Get requests pending approval (for board members)
 * @access  Private (root, board_member)
 */
router.get('/pending-approval', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  try {
    const requests = await PurchaseRequest.findAll({
      where: { status: 'pending_approval' },
      include: [
        { model: PurchaseCategory, as: 'category', required: false },
        { model: Supplier, as: 'preferredSupplier', required: false, attributes: ['id', 'business_name'] },
        { model: PurchaseRequestItem, as: 'items', required: false },
        {
          model: Quotation,
          as: 'quotations',
          required: false,
          attributes: ['id']
        }
      ],
      order: [['priority', 'DESC'], ['created_at', 'ASC']]
    });

    const requestsWithCount = requests.map(req => {
      const reqData = fixRequestEncoding(req);
      return {
        ...reqData,
        quotations_count: reqData.quotations ? reqData.quotations.length : 0
      };
    });

    res.json({
      success: true,
      data: requestsWithCount,
      count: requests.length
    });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener solicitudes pendientes',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/purchases/requests/:id
 * @desc    Get single purchase request with full details
 * @access  Private (root, board_member, admin_employee)
 */
router.get('/:id', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  // Import User model for querying user data
  const User = require('../../models/User');

  try {
    const request = await PurchaseRequest.findByPk(req.params.id, {
      include: [
        { model: PurchaseCategory, as: 'category' },
        { model: Supplier, as: 'preferredSupplier' },
        { model: PurchaseRequestItem, as: 'items', order: [['order_index', 'ASC']] },
        { model: PurchaseRequestHistory, as: 'history', order: [['created_at', 'DESC']] }
      ]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    // Fetch user data from main database if needed
    const userIds = [];
    if (request.requested_by) userIds.push(request.requested_by);
    if (request.approved_by) userIds.push(request.approved_by);

    // Also collect user IDs from history
    if (request.history && request.history.length > 0) {
      request.history.forEach(h => {
        if (h.user_id) userIds.push(h.user_id);
      });
    }

    let userMap = {};
    if (userIds.length > 0) {
      const uniqueUserIds = [...new Set(userIds)];
      const users = await User.findAll({
        where: { id: uniqueUserIds },
        attributes: ['id', 'username', 'email', 'nombre', 'apellido']
      });

      users.forEach(user => {
        const fullName = [user.nombre, user.apellido].filter(Boolean).join(' ').trim() || null;
        userMap[user.id] = {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: fullName
        };
      });
    }

    // Attach user data to request
    const requestData = request.toJSON ? request.toJSON() : request;

    // Add user info to history entries
    const historyWithUsers = requestData.history ? requestData.history.map(h => ({
      ...h,
      user: h.user_id ? userMap[h.user_id] : null
    })) : [];

    const requestWithUsers = {
      ...requestData,
      requestedBy: requestData.requested_by ? userMap[requestData.requested_by] : null,
      approvedBy: requestData.approved_by ? userMap[requestData.approved_by] : null,
      history: historyWithUsers
    };

    res.json({
      success: true,
      data: fixRequestEncoding(requestWithUsers)
    });
  } catch (error) {
    console.error('Error fetching purchase request:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener solicitud',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/requests
 * @desc    Create new purchase request
 * @access  Private (root, board_member, admin_employee)
 */
router.post('/', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const {
      title,
      description,
      justification,
      category_id,
      estimated_amount,
      currency,
      priority,
      preferred_supplier_id,
      required_date,
      attachment_url,
      notes,
      items
    } = req.body;

    // Validation
    if (!title || !description || !estimated_amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Título, descripción y monto estimado son requeridos'
      });
    }

    // Generate request number
    const request_number = await PurchaseRequest.generateRequestNumber();

    // Determine purchase type based on settings
    const directPurchaseLimit = await PurchaseSettings.getNumericSetting('direct_purchase_limit', 100000);
    const purchase_type = parseFloat(estimated_amount) <= directPurchaseLimit ? 'direct' : 'price_competition';

    // Create request
    const request = await PurchaseRequest.create({
      request_number,
      title,
      description,
      justification,
      category_id,
      estimated_amount,
      currency: currency || 'ARS',
      purchase_type,
      priority: priority || 'normal',
      status: 'draft',
      preferred_supplier_id,
      required_date,
      attachment_url,
      notes,
      requested_by: req.user.id
    }, { transaction });

    // Create items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const itemsToCreate = items.map((item, index) => ({
        request_id: request.id,
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || 'unidad',
        estimated_unit_price: item.estimated_unit_price,
        specifications: item.specifications,
        order_index: index
      }));
      await PurchaseRequestItem.bulkCreate(itemsToCreate, { transaction });
    }

    // Log history
    await PurchaseRequestHistory.logChange(
      request.id,
      'created',
      null,
      'draft',
      req.user.id,
      'Solicitud creada',
      transaction
    );

    await transaction.commit();

    // Fetch complete request
    const fullRequest = await PurchaseRequest.findByPk(request.id, {
      include: [
        { model: PurchaseCategory, as: 'category' },
        { model: Supplier, as: 'preferredSupplier' },
        { model: PurchaseRequestItem, as: 'items' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Solicitud de compra creada exitosamente',
      data: fixRequestEncoding(fullRequest)
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating purchase request:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear solicitud',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/purchases/requests/:id
 * @desc    Update purchase request (only if draft)
 * @access  Private (root, board_member, admin_employee)
 */
router.put('/:id', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const request = await PurchaseRequest.findByPk(req.params.id, { transaction });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    // Only allow editing drafts
    if (request.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden editar solicitudes en estado borrador'
      });
    }

    const {
      title,
      description,
      justification,
      category_id,
      estimated_amount,
      priority,
      preferred_supplier_id,
      required_date,
      attachment_url,
      notes,
      items
    } = req.body;

    // Recalculate purchase type if amount changed
    let purchase_type = request.purchase_type;
    if (estimated_amount && estimated_amount !== request.estimated_amount) {
      const directPurchaseLimit = await PurchaseSettings.getNumericSetting('direct_purchase_limit', 100000);
      purchase_type = parseFloat(estimated_amount) <= directPurchaseLimit ? 'direct' : 'price_competition';
    }

    await request.update({
      title: title ?? request.title,
      description: description ?? request.description,
      justification: justification ?? request.justification,
      category_id: category_id ?? request.category_id,
      estimated_amount: estimated_amount ?? request.estimated_amount,
      purchase_type,
      priority: priority ?? request.priority,
      preferred_supplier_id: preferred_supplier_id ?? request.preferred_supplier_id,
      required_date: required_date ?? request.required_date,
      attachment_url: attachment_url ?? request.attachment_url,
      notes: notes ?? request.notes
    }, { transaction });

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await PurchaseRequestItem.destroy({
        where: { request_id: request.id },
        transaction
      });

      // Create new items
      if (items.length > 0) {
        const itemsToCreate = items.map((item, index) => ({
          request_id: request.id,
          description: item.description,
          quantity: item.quantity || 1,
          unit: item.unit || 'unidad',
          estimated_unit_price: item.estimated_unit_price,
          specifications: item.specifications,
          order_index: index
        }));
        await PurchaseRequestItem.bulkCreate(itemsToCreate, { transaction });
      }
    }

    await transaction.commit();

    // Fetch updated request
    const fullRequest = await PurchaseRequest.findByPk(request.id, {
      include: [
        { model: PurchaseCategory, as: 'category' },
        { model: Supplier, as: 'preferredSupplier' },
        { model: PurchaseRequestItem, as: 'items' }
      ]
    });

    res.json({
      success: true,
      message: 'Solicitud actualizada exitosamente',
      data: fixRequestEncoding(fullRequest)
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating purchase request:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar solicitud',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/requests/:id/submit
 * @desc    Submit request for approval
 * @access  Private (root, board_member, admin_employee)
 */
router.post('/:id/submit', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const request = await PurchaseRequest.findByPk(req.params.id, { transaction });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    if (request.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden enviar solicitudes en estado borrador'
      });
    }

    const oldStatus = request.status;
    await request.update({ status: 'pending_approval' }, { transaction });

    await PurchaseRequestHistory.logChange(
      request.id,
      'submitted',
      oldStatus,
      'pending_approval',
      req.user.id,
      'Solicitud enviada para aprobación',
      transaction
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Solicitud enviada para aprobación',
      data: { status: 'pending_approval' }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting request:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar solicitud',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/requests/:id/approve
 * @desc    Approve purchase request
 * @access  Private (root, board_member)
 */
router.post('/:id/approve', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const { comments } = req.body;
    const request = await PurchaseRequest.findByPk(req.params.id, { transaction });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    if (request.status !== 'pending_approval') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden aprobar solicitudes pendientes de aprobación'
      });
    }

    const oldStatus = request.status;
    const newStatus = request.purchase_type === 'direct' ? 'approved' : 'in_quotation';

    await request.update({
      status: newStatus,
      approved_by: req.user.id,
      approved_at: new Date()
    }, { transaction });

    await PurchaseRequestHistory.logChange(
      request.id,
      'approved',
      oldStatus,
      newStatus,
      req.user.id,
      comments || 'Solicitud aprobada',
      transaction
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Solicitud aprobada exitosamente',
      data: {
        status: newStatus,
        purchase_type: request.purchase_type
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error approving request:', error);
    res.status(500).json({
      success: false,
      error: 'Error al aprobar solicitud',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/requests/:id/reject
 * @desc    Reject purchase request
 * @access  Private (root, board_member)
 */
router.post('/:id/reject', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const { reason } = req.body;

    if (!reason) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'La razón de rechazo es requerida'
      });
    }

    const request = await PurchaseRequest.findByPk(req.params.id, { transaction });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    if (request.status !== 'pending_approval') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden rechazar solicitudes pendientes de aprobación'
      });
    }

    const oldStatus = request.status;
    await request.update({
      status: 'rejected',
      rejection_reason: reason
    }, { transaction });

    await PurchaseRequestHistory.logChange(
      request.id,
      'rejected',
      oldStatus,
      'rejected',
      req.user.id,
      reason,
      transaction
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Solicitud rechazada',
      data: { status: 'rejected' }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error rejecting request:', error);
    res.status(500).json({
      success: false,
      error: 'Error al rechazar solicitud',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/requests/:id/cancel
 * @desc    Cancel purchase request
 * @access  Private (root, board_member, admin_employee)
 */
router.post('/:id/cancel', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  const transaction = await accountingDb.transaction();

  try {
    const { reason } = req.body;
    const request = await PurchaseRequest.findByPk(req.params.id, { transaction });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    // Cannot cancel completed requests
    if (['completed', 'cancelled'].includes(request.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'No se puede cancelar esta solicitud'
      });
    }

    const oldStatus = request.status;
    await request.update({ status: 'cancelled' }, { transaction });

    await PurchaseRequestHistory.logChange(
      request.id,
      'cancelled',
      oldStatus,
      'cancelled',
      req.user.id,
      reason || 'Solicitud cancelada',
      transaction
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Solicitud cancelada',
      data: { status: 'cancelled' }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error cancelling request:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cancelar solicitud',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/purchases/requests/:id
 * @desc    Delete purchase request (only drafts)
 * @access  Private (root, board_member)
 */
router.delete('/:id', authenticateToken, authorizeRoles('root', 'board_member'), async (req, res) => {
  try {
    const request = await PurchaseRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    if (request.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden eliminar solicitudes en estado borrador'
      });
    }

    await request.destroy();

    res.json({
      success: true,
      message: 'Solicitud eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar solicitud',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/requests/:id/generate-rfq-pdf
 * @desc    Generate RFQ PDF for a purchase request
 * @access  Private (root, board_member, admin_employee)
 */
router.post('/:id/generate-rfq-pdf', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const { suppliers, deadline } = req.body;
    const pdfService = require('../../services/pdfService');

    if (!deadline) {
      return res.status(400).json({
        success: false,
        error: 'La fecha límite es requerida'
      });
    }

    const request = await PurchaseRequest.findByPk(req.params.id, {
      include: [
        { model: PurchaseCategory, as: 'category' },
        { model: PurchaseRequestItem, as: 'items' }
      ]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    // Generate PDF
    const pdfBuffer = await pdfService.generateRFQPDF(request, suppliers, deadline);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=RFQ-${request.request_number}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating RFQ PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar PDF',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/requests/:id/send-rfq-email
 * @desc    Send RFQ PDF via email to suppliers
 * @access  Private (root, board_member, admin_employee)
 */
router.post('/:id/send-rfq-email', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const { suppliers, deadline } = req.body;
    const pdfService = require('../../services/pdfService');
    const emailService = require('../../services/emailService');

    if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe seleccionar al menos un proveedor'
      });
    }

    if (!deadline) {
      return res.status(400).json({
        success: false,
        error: 'La fecha límite es requerida'
      });
    }

    const request = await PurchaseRequest.findByPk(req.params.id, {
      include: [
        { model: PurchaseCategory, as: 'category' },
        { model: PurchaseRequestItem, as: 'items' }
      ]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    // Generate PDF
    const pdfBuffer = await pdfService.generateRFQPDF(request, suppliers, deadline);
    const filename = `RFQ-${request.request_number}.pdf`;
    const filepath = await pdfService.savePDFToTemp(pdfBuffer, filename);

    // Get supplier details
    const supplierRecords = await Supplier.findAll({
      where: {
        id: suppliers.map(s => s.id || s)
      }
    });

    // Send emails
    const emailPromises = supplierRecords.map(async (supplier) => {
      if (!supplier.email) {
        console.warn(`Supplier ${supplier.business_name} has no email`);
        return { success: false, supplier: supplier.business_name, reason: 'No email' };
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Solicitud de Cotización</h2>

            <p>Estimado/a proveedor,</p>

            <p>Adjuntamos solicitud de cotización para los siguientes productos/servicios:</p>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Número de RFQ:</strong> RFQ-${new Date().getFullYear()}-${String(request.id).padStart(4, '0')}</p>
              <p style="margin: 5px 0;"><strong>Título:</strong> ${request.title}</p>
              <p style="margin: 5px 0;"><strong>Fecha límite:</strong> ${new Date(deadline).toLocaleDateString('es-AR')}</p>
            </div>

            <p>Por favor revise el documento adjunto con los detalles completos de la solicitud.</p>

            <p>Agradeceremos enviar su cotización antes de la fecha límite indicada.</p>

            <p>Saludos cordiales,<br>
            <strong>Departamento de Compras</strong><br>
            Asociación Bernardino Rivadavia</p>
          </div>
        </body>
        </html>
      `;

      try {
        const fs = require('fs');
        const nodemailer = require('nodemailer');

        // Use the email service but add attachment
        const config = await emailService.getEmailConfig();
        if (!config.enabled) {
          return { success: false, supplier: supplier.business_name, reason: 'Email not configured' };
        }

        // Create transporter based on config
        let transporter;
        if (config.provider === 'smtp') {
          transporter = nodemailer.createTransporter({
            host: config.smtp_host,
            port: parseInt(config.smtp_port) || 587,
            secure: config.smtp_secure === true || config.smtp_secure === 'true',
            auth: config.smtp_user ? {
              user: config.smtp_user,
              pass: config.smtp_password
            } : undefined
          });
        } else if (config.provider === 'resend') {
          const { Resend } = require('resend');
          const resend = new Resend(config.resend_api_key);

          // Resend doesn't support attachments the same way, so convert to base64
          const pdfBase64 = pdfBuffer.toString('base64');

          await resend.emails.send({
            from: config.smtp_from_email || 'onboarding@resend.dev',
            to: supplier.email,
            subject: `Solicitud de Cotización - ${request.title}`,
            html,
            attachments: [{
              filename,
              content: pdfBase64
            }]
          });

          return { success: true, supplier: supplier.business_name };
        }

        // For SMTP
        if (transporter) {
          await transporter.sendMail({
            from: `"${config.smtp_from_name || 'Compras'}" <${config.smtp_from_email}>`,
            to: supplier.email,
            subject: `Solicitud de Cotización - ${request.title}`,
            html,
            attachments: [{
              filename,
              content: pdfBuffer
            }]
          });

          return { success: true, supplier: supplier.business_name };
        }

        return { success: false, supplier: supplier.business_name, reason: 'Unknown provider' };

      } catch (error) {
        console.error(`Error sending email to ${supplier.business_name}:`, error);
        return { success: false, supplier: supplier.business_name, reason: error.message };
      }
    });

    const results = await Promise.all(emailPromises);

    // Clean up temp file
    await pdfService.deleteTempFile(filepath);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    res.json({
      success: true,
      message: `RFQ enviado exitosamente a ${successful} de ${results.length} proveedores`,
      results: {
        successful,
        total: results.length,
        failed: failed.map(f => ({ supplier: f.supplier, reason: f.reason }))
      }
    });

  } catch (error) {
    console.error('Error sending RFQ emails:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar emails',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/purchases/requests/:id/send-rfq-whatsapp
 * @desc    Send RFQ PDF via WhatsApp to suppliers
 * @access  Private (root, board_member, admin_employee)
 */
router.post('/:id/send-rfq-whatsapp', authenticateToken, authorizeRoles('root', 'board_member', 'admin_employee'), async (req, res) => {
  try {
    const { suppliers, deadline } = req.body;
    const pdfService = require('../../services/pdfService');
    const whatsappService = require('../../services/whatsapp');

    if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe seleccionar al menos un proveedor'
      });
    }

    if (!deadline) {
      return res.status(400).json({
        success: false,
        error: 'La fecha límite es requerida'
      });
    }

    // Check if WhatsApp is connected
    const sessionId = whatsappService.getDefaultSessionId();
    const status = whatsappService.getConnectionStatus(sessionId);

    if (!status.active || status.state.status !== 'connected') {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp no está conectado. Por favor conecte WhatsApp primero desde la configuración del sistema.'
      });
    }

    const request = await PurchaseRequest.findByPk(req.params.id, {
      include: [
        { model: PurchaseCategory, as: 'category' },
        { model: PurchaseRequestItem, as: 'items' }
      ]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    // Get supplier details
    const supplierRecords = await Supplier.findAll({
      where: {
        id: suppliers.map(s => s.id || s)
      }
    });

    // Send messages
    const messagePromises = supplierRecords.map(async (supplier) => {
      if (!supplier.phone && !supplier.mobile) {
        console.warn(`Supplier ${supplier.business_name} has no phone number`);
        return { success: false, supplier: supplier.business_name, reason: 'No phone number' };
      }

      const phone = (supplier.mobile || supplier.phone).replace(/[^0-9]/g, '');

      const message = `*Solicitud de Cotización*\n\n` +
        `Estimado/a proveedor,\n\n` +
        `Le enviamos solicitud de cotización:\n\n` +
        `*Número RFQ:* RFQ-${new Date().getFullYear()}-${String(request.id).padStart(4, '0')}\n` +
        `*Título:* ${request.title}\n` +
        `*Fecha límite:* ${new Date(deadline).toLocaleDateString('es-AR')}\n\n` +
        `Por favor revise los detalles y envíe su cotización antes de la fecha límite.\n\n` +
        `Saludos cordiales,\n` +
        `*Departamento de Compras*\n` +
        `Asociación Bernardino Rivadavia`;

      try {
        const result = await whatsappService.sendMessage(sessionId, phone, message);

        if (result.success) {
          return { success: true, supplier: supplier.business_name };
        } else {
          return { success: false, supplier: supplier.business_name, reason: result.message };
        }
      } catch (error) {
        console.error(`Error sending WhatsApp to ${supplier.business_name}:`, error);
        return { success: false, supplier: supplier.business_name, reason: error.message };
      }
    });

    const results = await Promise.all(messagePromises);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    res.json({
      success: true,
      message: `RFQ enviado por WhatsApp exitosamente a ${successful} de ${results.length} proveedores`,
      results: {
        successful,
        total: results.length,
        failed: failed.map(f => ({ supplier: f.supplier, reason: f.reason }))
      }
    });

  } catch (error) {
    console.error('Error sending RFQ via WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar por WhatsApp',
      message: error.message
    });
  }
});

module.exports = router;
