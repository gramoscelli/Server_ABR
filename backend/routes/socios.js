const express = require('express');
const router = express.Router();
const { Socio, Grupo, CobroCuota, TipoDocumento, Cobrador, Adicional } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken, authenticateTokenOrApiKey, authorizeRoles } = require('../middleware/auth');
const { fixEncoding } = require('../utils/encoding');

// Text fields that may have encoding issues
const TEXT_FIELDS = ['So_Nombre', 'So_Apellido', 'So_DomRes', 'So_DomCob', 'So_Telef', 'So_Email', 'So_NotaCob', 'So_Obs',
                     'So_Aut_Apellido', 'So_Aut_Nombre', 'So_Aut_Domi', 'So_Aut_Telef'];

/**
 * Fix encoding for socio data
 */
function fixSocioEncoding(socio) {
  const fixed = socio.toJSON ? socio.toJSON() : { ...socio };
  TEXT_FIELDS.forEach(field => {
    if (fixed[field]) fixed[field] = fixEncoding(fixed[field]);
  });
  return fixed;
}

// =============================================
// DROPDOWN DATA ENDPOINTS
// IMPORTANT: These must be defined BEFORE routes with :id parameters
// =============================================

/**
 * GET /api/socios/dropdown/grupos
 * Get all grupos for dropdown
 */
router.get('/dropdown/grupos', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const grupos = await Grupo.findAll({
      attributes: ['Gr_ID', 'Gr_Nombre', 'Gr_Titulo', 'Gr_Cuota', 'Gr_Habilitado'],
      order: [['Gr_Nombre', 'ASC']]
    });

    const fixed = grupos.map(g => {
      const item = g.toJSON();
      item.Gr_Nombre = fixEncoding(item.Gr_Nombre);
      item.Gr_Titulo = fixEncoding(item.Gr_Titulo);
      return item;
    });

    res.json({ success: true, data: fixed });
  } catch (error) {
    console.error('Error fetching grupos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener grupos' });
  }
});

/**
 * GET /api/socios/dropdown/tipos-documento
 * Get all document types for dropdown
 */
router.get('/dropdown/tipos-documento', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const tipos = await TipoDocumento.findAll({
      attributes: ['TD_ID', 'TD_Tipo'],
      order: [['TD_Tipo', 'ASC']]
    });

    res.json({ success: true, data: tipos });
  } catch (error) {
    console.error('Error fetching tipos documento:', error);
    res.status(500).json({ success: false, error: 'Error al obtener tipos de documento' });
  }
});

/**
 * GET /api/socios/dropdown/cobradores
 * Get all cobradores for dropdown
 */
router.get('/dropdown/cobradores', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const cobradores = await Cobrador.findAll({
      attributes: ['Co_ID', 'Co_Nombre'],
      order: [['Co_Nombre', 'ASC']]
    });

    const fixed = cobradores.map(c => {
      const item = c.toJSON();
      item.Co_Nombre = fixEncoding(item.Co_Nombre);
      return item;
    });

    res.json({ success: true, data: fixed });
  } catch (error) {
    console.error('Error fetching cobradores:', error);
    res.status(500).json({ success: false, error: 'Error al obtener cobradores' });
  }
});

// =============================================
// SEARCH ENDPOINTS
// =============================================

/**
 * GET /api/socios/search
 * Search for socios by name, surname, ID, or document number (DNI)
 * Query params:
 *   - q: search term (required)
 *   - limit: max number of results (optional, default: 20)
 */
router.get('/search', authenticateTokenOrApiKey, authorizeRoles('root', 'admin_employee', 'library_employee'), async (req, res) => {
  console.log('=== SOCIOS SEARCH REQUEST ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('User from token:', req.user);
  console.log('Query params:', req.query);

  try {
    const { q, limit = 20 } = req.query;

    // If no search term, return empty array
    if (!q || q.trim().length === 0) {
      console.log('Empty search term, returning empty array');
      return res.json({ success: true, data: [], total: 0 });
    }

    const searchTerm = q.trim();
    const maxLimit = Math.min(parseInt(limit), 100); // Max 100 results

    console.log(`Searching for: "${searchTerm}", limit: ${maxLimit}`);

    // Check if search term is a number (for ID search)
    const isNumeric = !isNaN(searchTerm);

    // Build search conditions
    const searchConditions = [
      { So_Nombre: { [Op.like]: `${searchTerm}%` } },    // Starts with
      { So_Apellido: { [Op.like]: `${searchTerm}%` } },  // Starts with
      { So_NroDoc: { [Op.like]: `${searchTerm}%` } }     // Starts with (DNI)
    ];

    // If it's a number, also search by ID
    if (isNumeric) {
      searchConditions.push({ So_ID: { [Op.eq]: parseInt(searchTerm) } });
    }

    console.log('Search conditions:', JSON.stringify(searchConditions, null, 2));

    const socios = await Socio.findAll({
      where: {
        [Op.or]: searchConditions
      },
      include: [
        {
          model: Grupo,
          as: 'grupo',
          attributes: ['Gr_ID', 'Gr_Nombre', 'Gr_Titulo']
        },
        {
          model: CobroCuota,
          as: 'cuotas',
          attributes: ['CC_ID', 'CC_Anio', 'CC_Mes', 'CC_Valor', 'CC_Cobrado', 'CC_FechaCobrado'],
          where: {
            CC_Anulado: 'N',
            CC_Cobrado: 'Y'
          },
          required: false,  // LEFT JOIN - allow socios without cuotas
          limit: 1,
          order: [['CC_Anio', 'DESC'], ['CC_Mes', 'DESC']]  // Get the most recent one
        }
      ],
      limit: maxLimit,
      order: [['So_Apellido', 'ASC'], ['So_Nombre', 'ASC']]
    });

    console.log(`Found ${socios.length} socios`);
    console.log('=== END SOCIOS SEARCH ===');

    // Fix encoding issues (Latin1 to UTF-8 conversion) and add grupo name
    const fixedSocios = socios.map(socio => {
      const fixed = fixSocioEncoding(socio);

      // Add grupo name and fix encoding
      if (fixed.grupo) {
        fixed.Gr_Nombre = fixEncoding(fixed.grupo.Gr_Nombre);
        fixed.Gr_Titulo = fixEncoding(fixed.grupo.Gr_Titulo);
        delete fixed.grupo;
      }

      // Convert photo blob to base64 if exists
      if (fixed.So_Foto && Buffer.isBuffer(fixed.So_Foto)) {
        fixed.So_Foto_Base64 = `data:image/jpeg;base64,${fixed.So_Foto.toString('base64')}`;
        delete fixed.So_Foto;
      } else {
        delete fixed.So_Foto;
      }

      // Extract last cuota and flatten
      if (fixed.cuotas && fixed.cuotas.length > 0) {
        const ultimaCuota = fixed.cuotas[0];
        fixed.UltimaCuota_Anio = ultimaCuota.CC_Anio;
        fixed.UltimaCuota_Mes = ultimaCuota.CC_Mes;
        fixed.UltimaCuota_Valor = ultimaCuota.CC_Valor;
        fixed.UltimaCuota_FechaCobrado = ultimaCuota.CC_FechaCobrado;
      }
      delete fixed.cuotas;

      return fixed;
    });

    // Get tipo documento names for autorizados
    const tipoDocIds = [...new Set(fixedSocios.map(s => s.So_Aut_TipoDoc).filter(id => id))];
    if (tipoDocIds.length > 0) {
      const tiposDoc = await TipoDocumento.findAll({
        where: { TD_ID: { [Op.in]: tipoDocIds } },
        attributes: ['TD_ID', 'TD_Tipo']
      });
      const tipoDocMap = {};
      tiposDoc.forEach(td => { tipoDocMap[td.TD_ID] = td.TD_Tipo; });
      fixedSocios.forEach(s => {
        if (s.So_Aut_TipoDoc && tipoDocMap[s.So_Aut_TipoDoc]) {
          s.TD_Aut_Tipo = tipoDocMap[s.So_Aut_TipoDoc];
        }
      });
    }

    res.json({
      success: true,
      data: fixedSocios,
      total: fixedSocios.length
    });
  } catch (error) {
    console.error('=== ERROR IN SOCIOS SEARCH ===');
    console.error('Error searching socios:', error);
    console.error('Stack:', error.stack);
    console.error('=== END ERROR ===');
    res.status(500).json({
      success: false,
      message: 'Error al buscar socios',
      error: error.message
    });
  }
});

// =============================================
// REPORT ENDPOINTS
// IMPORTANT: These must be defined BEFORE routes with :id parameters
// =============================================

/**
 * GET /api/socios/report/por-grupo
 * Get socios grouped by grupo with statistics
 * Query params:
 *   - includeInactive: whether to include inactive socios (default: false)
 */
router.get('/report/por-grupo', authenticateToken, authorizeRoles('root', 'admin_employee', 'library_employee'), async (req, res) => {
  try {
    const { includeInactive = false } = req.query;

    // Get all grupos
    const grupos = await Grupo.findAll({
      attributes: ['Gr_ID', 'Gr_Nombre', 'Gr_Titulo', 'Gr_Cuota'],
      order: [['Gr_Nombre', 'ASC']]
    });

    // Get all socios with their grupo and latest payment info
    const whereClause = {};
    if (includeInactive === 'false') {
      whereClause.So_Fallecido = 'Y'; // Only active socios
    }

    const socios = await Socio.findAll({
      where: whereClause,
      include: [
        {
          model: Grupo,
          as: 'grupo',
          attributes: ['Gr_ID', 'Gr_Nombre', 'Gr_Titulo', 'Gr_Cuota']
        },
        {
          model: CobroCuota,
          as: 'cuotas',
          attributes: ['CC_ID', 'CC_Anio', 'CC_Mes', 'CC_Valor', 'CC_Cobrado', 'CC_FechaCobrado'],
          where: {
            CC_Anulado: 'N',
            CC_Cobrado: 'Y'
          },
          required: false,
          limit: 1,
          order: [['CC_Anio', 'DESC'], ['CC_Mes', 'DESC']]
        }
      ],
      order: [['Gr_ID', 'ASC'], ['So_Apellido', 'ASC'], ['So_Nombre', 'ASC']]
    });

    // Organize data by grupo
    const reportData = {};

    grupos.forEach(grupo => {
      const grupoData = grupo.toJSON();
      grupoData.Gr_Nombre = fixEncoding(grupoData.Gr_Nombre);
      grupoData.Gr_Titulo = fixEncoding(grupoData.Gr_Titulo);

      reportData[grupo.Gr_ID] = {
        ...grupoData,
        socios: [],
        totalSocios: 0,
        totalCuota: 0,
        sociosMorados: 0,
        ultimaActualizacion: new Date().toISOString()
      };
    });

    // Add socios to their respective grupos
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    socios.forEach(socio => {
      const json = socio.toJSON();
      const fixed = fixSocioEncoding(socio);

      // Add grupo reference
      if (json.grupo) {
        fixed.grupo = {
          Gr_ID: json.grupo.Gr_ID,
          Gr_Nombre: fixEncoding(json.grupo.Gr_Nombre),
          Gr_Titulo: fixEncoding(json.grupo.Gr_Titulo),
          Gr_Cuota: json.grupo.Gr_Cuota
        };
      }

      // Calculate payment status
      let estadoPago = 'Sin pagos';
      let mesesAtraso = null;

      if (fixed.cuotas && fixed.cuotas.length > 0) {
        const ultimaCuota = fixed.cuotas[0];
        const monthsDiff = (currentYear - ultimaCuota.CC_Anio) * 12 + (currentMonth - ultimaCuota.CC_Mes);
        mesesAtraso = monthsDiff;

        if (monthsDiff === 0) {
          estadoPago = 'Al día';
        } else if (monthsDiff > 0) {
          estadoPago = `${monthsDiff} mes(es) atraso`;
        }

        fixed.UltimaCuota_Anio = ultimaCuota.CC_Anio;
        fixed.UltimaCuota_Mes = ultimaCuota.CC_Mes;
        fixed.UltimaCuota_Valor = ultimaCuota.CC_Valor;
        fixed.UltimaCuota_FechaCobrado = ultimaCuota.CC_FechaCobrado;
      }

      fixed.estadoPago = estadoPago;
      fixed.mesesAtraso = mesesAtraso;
      delete fixed.cuotas;
      delete fixed.So_Foto;

      // Add to grupo
      if (reportData[fixed.Gr_ID]) {
        reportData[fixed.Gr_ID].socios.push(fixed);
        reportData[fixed.Gr_ID].totalSocios++;
        // Use grupo Gr_Cuota value, not socio's value
        reportData[fixed.Gr_ID].totalCuota += reportData[fixed.Gr_ID].Gr_Cuota || 0;

        // Count morosos (socios with payment delay > 0)
        if (mesesAtraso !== null && mesesAtraso > 0) {
          reportData[fixed.Gr_ID].sociosMorados++;
        }
      }
    });

    // Convert to array, removing empty grupos
    const report = Object.values(reportData).filter(g => g.totalSocios > 0);

    res.json({
      success: true,
      data: report,
      summary: {
        totalGrupos: report.length,
        totalSocios: socios.length,
        totalCuotaMensual: report.reduce((sum, g) => sum + g.totalCuota, 0),
        totalMorados: report.reduce((sum, g) => sum + g.sociosMorados, 0),
        fechaGeneracion: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating report por grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte por grupo',
      error: error.message
    });
  }
});

/**
 * GET /api/socios/:id
 * Get a single socio by ID
 */
router.get('/:id', authenticateToken, authorizeRoles('root', 'admin_employee', 'library_employee'), async (req, res) => {
  try {
    const { id } = req.params;

    const socio = await Socio.findByPk(id, {
      include: [
        {
          model: Grupo,
          as: 'grupo',
          attributes: ['Gr_ID', 'Gr_Nombre', 'Gr_Titulo']
        },
        {
          model: CobroCuota,
          as: 'cuotas',
          attributes: ['CC_ID', 'CC_Anio', 'CC_Mes', 'CC_Valor', 'CC_Cobrado', 'CC_FechaCobrado'],
          where: {
            CC_Anulado: 'N',
            CC_Cobrado: 'Y'
          },
          required: false,  // LEFT JOIN - allow socios without cuotas
          limit: 1,
          order: [['CC_Anio', 'DESC'], ['CC_Mes', 'DESC']]  // Get the most recent one
        }
      ]
    });

    if (!socio) {
      return res.status(404).json({
        success: false,
        message: 'Socio no encontrado'
      });
    }

    // Fix encoding issues (Latin1 to UTF-8 conversion)
    const fixed = fixSocioEncoding(socio);

    // Add grupo name and fix encoding
    if (fixed.grupo) {
      fixed.Gr_Nombre = fixEncoding(fixed.grupo.Gr_Nombre);
      fixed.Gr_Titulo = fixEncoding(fixed.grupo.Gr_Titulo);
      delete fixed.grupo;
    }

    // Convert photo blob to base64 if exists
    if (fixed.So_Foto && Buffer.isBuffer(fixed.So_Foto)) {
      fixed.So_Foto_Base64 = `data:image/jpeg;base64,${fixed.So_Foto.toString('base64')}`;
      delete fixed.So_Foto;
    } else {
      delete fixed.So_Foto;
    }

    // Extract last cuota and flatten
    if (fixed.cuotas && fixed.cuotas.length > 0) {
      const ultimaCuota = fixed.cuotas[0];
      fixed.UltimaCuota_Anio = ultimaCuota.CC_Anio;
      fixed.UltimaCuota_Mes = ultimaCuota.CC_Mes;
      fixed.UltimaCuota_Valor = ultimaCuota.CC_Valor;
      fixed.UltimaCuota_FechaCobrado = ultimaCuota.CC_FechaCobrado;
    }
    delete fixed.cuotas;

    res.json({
      success: true,
      data: fixed
    });
  } catch (error) {
    console.error('Error getting socio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener socio',
      error: error.message
    });
  }
});

/**
 * GET /api/socios/morosos/:months
 * Get socios with payment delays of at least X months
 * Params:
 *   - months: minimum number of months delayed (required)
 */
router.get('/morosos/:months', authenticateToken, authorizeRoles('root', 'admin_employee', 'library_employee'), async (req, res) => {
  try {
    const { months } = req.params;
    const monthsDelayed = parseInt(months);

    if (isNaN(monthsDelayed) || monthsDelayed < 1) {
      return res.status(400).json({
        success: false,
        message: 'El número de meses debe ser un valor positivo'
      });
    }

    console.log(`Finding socios with at least ${monthsDelayed} months delayed`);

    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 0-indexed, so add 1

    // Get all socios with their latest payment
    const socios = await Socio.findAll({
      include: [
        {
          model: Grupo,
          as: 'grupo',
          attributes: ['Gr_ID', 'Gr_Nombre', 'Gr_Titulo']
        },
        {
          model: CobroCuota,
          as: 'cuotas',
          attributes: ['CC_ID', 'CC_Anio', 'CC_Mes', 'CC_Valor', 'CC_FechaCobrado'],
          where: {
            CC_Anulado: 'N',
            CC_Cobrado: 'Y'
          },
          required: false,  // LEFT JOIN - include socios without payments
          limit: 1,
          order: [['CC_Anio', 'DESC'], ['CC_Mes', 'DESC']]  // Get the most recent payment
        }
      ],
      order: [['So_Apellido', 'ASC'], ['So_Nombre', 'ASC']]
    });

    // Filter socios by months delayed and calculate delay
    // Only include socios with at least one payment
    const morosos = socios
      .map(socio => {
        const json = socio.toJSON ? socio.toJSON() : socio;

        // Skip socios without any payments
        if (!json.cuotas || json.cuotas.length === 0) {
          return null;
        }

        // Fix text fields encoding using unified function
        const fixed = fixSocioEncoding(socio);

        // Add grupo name
        if (fixed.grupo) {
          fixed.Gr_Nombre = fixEncoding(fixed.grupo.Gr_Nombre);
          fixed.Gr_Titulo = fixEncoding(fixed.grupo.Gr_Titulo);
          delete fixed.grupo;
        }

        // Calculate months delayed based on last payment
        const ultimaCuota = fixed.cuotas[0];
        const lastPaymentYear = ultimaCuota.CC_Anio;
        const lastPaymentMonth = ultimaCuota.CC_Mes;

        // Calculate months difference
        const monthsDiff = (currentYear - lastPaymentYear) * 12 + (currentMonth - lastPaymentMonth);

        fixed.UltimaCuota_Anio = lastPaymentYear;
        fixed.UltimaCuota_Mes = lastPaymentMonth;
        fixed.UltimaCuota_Valor = ultimaCuota.CC_Valor;
        fixed.UltimaCuota_FechaCobrado = ultimaCuota.CC_FechaCobrado;
        fixed.MesesAtraso = monthsDiff;

        delete fixed.cuotas;
        delete fixed.So_Foto;

        return fixed;
      })
      .filter(socio => socio !== null && socio.MesesAtraso >= monthsDelayed);

    console.log(`Found ${morosos.length} socios with ${monthsDelayed}+ months delayed`);

    res.json({
      success: true,
      data: morosos,
      total: morosos.length,
      criteria: {
        mesesMinimos: monthsDelayed,
        fechaConsulta: `${currentYear}-${String(currentMonth).padStart(2, '0')}`
      }
    });
  } catch (error) {
    console.error('Error getting morosos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener socios morosos',
      error: error.message
    });
  }
});

// =============================================
// SOCIO CRUD ENDPOINTS
// =============================================

/**
 * GET /api/socios/:id/full
 * Get complete socio data including all relations for editing
 */
router.get('/:id/full', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { id } = req.params;

    const socio = await Socio.findByPk(id, {
      include: [
        { model: Grupo, as: 'grupo', attributes: ['Gr_ID', 'Gr_Nombre', 'Gr_Titulo', 'Gr_Cuota'] },
        { model: TipoDocumento, as: 'tipoDocumento', attributes: ['TD_ID', 'TD_Tipo'] },
        { model: Cobrador, as: 'cobrador', attributes: ['Co_ID', 'Co_Nombre'] },
        { model: Adicional, as: 'adicionales', include: [
          { model: TipoDocumento, as: 'tipoDocumento', attributes: ['TD_ID', 'TD_Tipo'] }
        ]},
        {
          model: CobroCuota, as: 'cuotas',
          attributes: ['CC_ID', 'CC_Anio', 'CC_Mes', 'CC_Valor', 'CC_Cobrado', 'CC_FechaCobrado'],
          where: { CC_Anulado: 'N', CC_Cobrado: 'Y' },
          required: false,
          limit: 1,
          order: [['CC_Anio', 'DESC'], ['CC_Mes', 'DESC']]
        }
      ]
    });

    if (!socio) {
      return res.status(404).json({ success: false, error: 'Socio no encontrado' });
    }

    const fixed = fixSocioEncoding(socio);

    // Fix related data encoding
    if (fixed.grupo) {
      fixed.grupo.Gr_Nombre = fixEncoding(fixed.grupo.Gr_Nombre);
      fixed.grupo.Gr_Titulo = fixEncoding(fixed.grupo.Gr_Titulo);
    }
    if (fixed.cobrador) {
      fixed.cobrador.Co_Nombre = fixEncoding(fixed.cobrador.Co_Nombre);
    }
    if (fixed.adicionales) {
      fixed.adicionales = fixed.adicionales.map(a => ({
        ...a,
        Ad_ApeNom: fixEncoding(a.Ad_ApeNom)
      }));
    }

    // Convert photo to base64
    if (fixed.So_Foto && Buffer.isBuffer(fixed.So_Foto)) {
      fixed.So_Foto_Base64 = `data:image/jpeg;base64,${fixed.So_Foto.toString('base64')}`;
    }
    delete fixed.So_Foto;

    // Extract ultima cuota
    if (fixed.cuotas && fixed.cuotas.length > 0) {
      fixed.UltimaCuota = fixed.cuotas[0];
    }
    delete fixed.cuotas;

    res.json({ success: true, data: fixed });
  } catch (error) {
    console.error('Error fetching full socio:', error);
    res.status(500).json({ success: false, error: 'Error al obtener datos del socio' });
  }
});

/**
 * PUT /api/socios/:id
 * Update socio data
 */
router.put('/:id', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const socio = await Socio.findByPk(id);
    if (!socio) {
      return res.status(404).json({ success: false, error: 'Socio no encontrado' });
    }

    // Allowed fields to update
    const allowedFields = [
      'So_Apellido', 'So_Nombre', 'So_DomRes', 'So_DomCob', 'So_Telef',
      'TD_ID', 'So_NroDoc', 'So_FecNac', 'So_AnioIngre', 'So_MesIngre',
      'So_NotaCob', 'So_Obs', 'Gr_ID', 'Co_ID', 'So_PersFisica', 'So_Fallecido',
      'So_DiferenciaCuota', 'So_NroCarnet', 'So_Email',
      'So_Aut_Apellido', 'So_Aut_Nombre', 'So_Aut_Domi', 'So_Aut_Telef',
      'So_Aut_TipoDoc', 'So_Aut_NroDoc'
    ];

    // Update only allowed fields
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        socio[field] = updateData[field];
      }
    });

    // Handle photo update separately (base64 to buffer)
    if (updateData.So_Foto_Base64) {
      const base64Data = updateData.So_Foto_Base64.replace(/^data:image\/\w+;base64,/, '');
      socio.So_Foto = Buffer.from(base64Data, 'base64');
    }

    await socio.save();

    // Return updated socio
    const updated = await Socio.findByPk(id, {
      include: [
        { model: Grupo, as: 'grupo', attributes: ['Gr_ID', 'Gr_Nombre'] },
        { model: TipoDocumento, as: 'tipoDocumento', attributes: ['TD_ID', 'TD_Tipo'] },
        { model: Cobrador, as: 'cobrador', attributes: ['Co_ID', 'Co_Nombre'] }
      ]
    });

    const fixed = fixSocioEncoding(updated);
    if (fixed.So_Foto) delete fixed.So_Foto;

    res.json({
      success: true,
      message: 'Socio actualizado exitosamente',
      data: fixed
    });
  } catch (error) {
    console.error('Error updating socio:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar socio', message: error.message });
  }
});

/**
 * POST /api/socios/:id/dar-baja
 * Deactivate (dar de baja) a socio - sets So_Fallecido = 'Y'
 */
router.post('/:id/dar-baja', authenticateToken, authorizeRoles('root', 'admin_employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const socio = await Socio.findByPk(id);
    if (!socio) {
      return res.status(404).json({ success: false, error: 'Socio no encontrado' });
    }

    // Mark as inactive
    socio.So_Fallecido = 'N'; // Note: 'N' means inactive in this inverted logic

    // Optionally add reason to observations
    if (motivo) {
      const fecha = new Date().toLocaleDateString('es-AR');
      const obsActual = socio.So_Obs || '';
      socio.So_Obs = `${obsActual}\n[BAJA ${fecha}] ${motivo}`.trim();
    }

    await socio.save();

    res.json({
      success: true,
      message: 'Socio dado de baja exitosamente',
      data: { So_ID: socio.So_ID, So_Fallecido: socio.So_Fallecido }
    });
  } catch (error) {
    console.error('Error deactivating socio:', error);
    res.status(500).json({ success: false, error: 'Error al dar de baja al socio' });
  }
});

module.exports = router;
