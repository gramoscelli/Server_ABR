const express = require('express');
const router = express.Router();
const Socio = require('../models/Socio');
const Grupo = require('../models/Grupo');
const CobroCuota = require('../models/CobroCuota');
const { Op } = require('sequelize');
const { authenticateToken, authenticateTokenOrApiKey, authorizeRoles } = require('../middleware/auth');

/**
 * Fix encoding issues - only convert if text appears to be double-encoded
 * Detects patterns like "Ã±" (which should be "ñ") or "Ã³" (which should be "ó")
 */
function fixEncoding(text) {
  if (!text || typeof text !== 'string') return text;

  // Fix specific mojibake patterns
  // These occur when UTF-8 data (C3 91 for Ñ) is misinterpreted
  let fixed = text;

  // Replace known double-encoded patterns
  const replacements = {
    'Ã\u2018': 'Ñ',  // C3 91 misread as Ã' (U+2018 left single quotation mark)
    'Ã±': 'ñ',       // C3 B1
    'Ã¡': 'á',       // C3 A1
    'Ã©': 'é',       // C3 A9
    'Ã­': 'í',       // C3 AD
    'Ã³': 'ó',       // C3 B3
    'Ãº': 'ú',       // C3 BA
    'Ã\x81': 'Á',   // C3 81
    'Ã‰': 'É',       // C3 89
    'Ã\x8D': 'Í',   // C3 8D
    'Ã"': 'Ó',       // C3 93
    'Ãš': 'Ú',       // C3 9A
    'Ã¼': 'ü',       // C3 BC
    'Ã\u0153': 'Ü', // C3 9C
  };

  for (const [wrong, correct] of Object.entries(replacements)) {
    if (fixed.includes(wrong)) {
      fixed = fixed.replace(new RegExp(wrong, 'g'), correct);
    }
  }

  return fixed;
}

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
      const fixed = socio.toJSON();

      // Fix text fields that may have encoding issues
      const textFields = ['So_Nombre', 'So_Apellido', 'So_DomRes', 'So_DomCob', 'So_Telef', 'So_Email', 'So_NotaCob', 'So_Obs'];
      textFields.forEach(field => {
        fixed[field] = fixEncoding(fixed[field]);
      });

      // Add grupo name and fix encoding
      if (fixed.grupo) {
        fixed.Gr_Nombre = fixEncoding(fixed.grupo.Gr_Nombre);
        fixed.Gr_Titulo = fixEncoding(fixed.grupo.Gr_Titulo);
        // Remove the nested grupo object to flatten the response
        delete fixed.grupo;
      }

      // Convert photo blob to base64 if exists
      if (fixed.So_Foto && Buffer.isBuffer(fixed.So_Foto)) {
        fixed.So_Foto_Base64 = `data:image/jpeg;base64,${fixed.So_Foto.toString('base64')}`;
        delete fixed.So_Foto; // Remove the binary data
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
      delete fixed.cuotas; // Remove the nested cuotas array

      return fixed;
    });

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

    // Fix encoding issues (Latin1 to UTF-8 conversion) and add grupo name
    const fixed = socio.toJSON();
    const textFields = ['So_Nombre', 'So_Apellido', 'So_DomRes', 'So_DomCob', 'So_Telef', 'So_Email', 'So_NotaCob', 'So_Obs'];
    textFields.forEach(field => {
      fixed[field] = fixEncoding(fixed[field]);
    });

    // Add grupo name and fix encoding
    if (fixed.grupo) {
      fixed.Gr_Nombre = fixEncoding(fixed.grupo.Gr_Nombre);
      fixed.Gr_Titulo = fixEncoding(fixed.grupo.Gr_Titulo);
      // Remove the nested grupo object to flatten the response
      delete fixed.grupo;
    }

    // Convert photo blob to base64 if exists
    if (fixed.So_Foto && Buffer.isBuffer(fixed.So_Foto)) {
      fixed.So_Foto_Base64 = `data:image/jpeg;base64,${fixed.So_Foto.toString('base64')}`;
      delete fixed.So_Foto; // Remove the binary data
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
    delete fixed.cuotas; // Remove the nested cuotas array

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
    const morosos = socios.map(socio => {
      const fixed = socio.toJSON();

      // Fix text fields encoding
      const textFields = ['So_Nombre', 'So_Apellido', 'So_DomRes', 'So_DomCob', 'So_Telef'];
      textFields.forEach(field => {
        fixed[field] = fixEncoding(fixed[field]);
      });

      // Add grupo name
      if (fixed.grupo) {
        fixed.Gr_Nombre = fixEncoding(fixed.grupo.Gr_Nombre);
        fixed.Gr_Titulo = fixEncoding(fixed.grupo.Gr_Titulo);
        delete fixed.grupo;
      }

      // Calculate months delayed
      let lastPaymentYear = null;
      let lastPaymentMonth = null;
      let delayedMonths = null;

      if (fixed.cuotas && fixed.cuotas.length > 0) {
        const ultimaCuota = fixed.cuotas[0];
        lastPaymentYear = ultimaCuota.CC_Anio;
        lastPaymentMonth = ultimaCuota.CC_Mes;

        // Calculate months difference
        const monthsDiff = (currentYear - lastPaymentYear) * 12 + (currentMonth - lastPaymentMonth);
        delayedMonths = monthsDiff;

        fixed.UltimaCuota_Anio = lastPaymentYear;
        fixed.UltimaCuota_Mes = lastPaymentMonth;
        fixed.UltimaCuota_Valor = ultimaCuota.CC_Valor;
        fixed.UltimaCuota_FechaCobrado = ultimaCuota.CC_FechaCobrado;
      } else {
        // No payments found - calculate from registration date
        const registrationYear = fixed.So_AnioIngre || currentYear;
        const registrationMonth = fixed.So_MesIngre || 1;
        delayedMonths = (currentYear - registrationYear) * 12 + (currentMonth - registrationMonth);
      }

      delete fixed.cuotas;
      delete fixed.So_Foto; // Remove photo

      fixed.MesesAtraso = delayedMonths;

      return fixed;
    }).filter(socio => socio.MesesAtraso >= monthsDelayed);

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

module.exports = router;
