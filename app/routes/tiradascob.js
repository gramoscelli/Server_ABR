/**
 * Tiradas de Cobro Routes (Sequelize)
 * Fee collection query endpoints
 */

const express = require('express');
const router = express.Router();
const { CobroCuota, Socio, Grupo } = require('../models');
const { Op } = require('sequelize');

const FEE_BY_PAGE = 8;

/**
 * Validate numeric parameter
 */
function validateNumber(value, paramName, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const num = parseInt(value);

  if (isNaN(num)) {
    return { valid: false, error: `${paramName} debe ser un número válido` };
  }

  if (num < min || num > max) {
    return { valid: false, error: `${paramName} debe estar entre ${min} y ${max}` };
  }

  return { valid: true, value: num };
}

/**
 * Transform Sequelize result to match original API format
 */
function transformResult(cuota) {
  return {
    CC_ID: cuota.CC_ID,
    CC_Mes: cuota.CC_Mes,
    CC_Anio: cuota.CC_Anio,
    CC_Valor: cuota.CC_Valor,
    Co_ID: cuota.Co_ID,
    So_ID: cuota.So_ID,
    nombre: cuota.socio ? `${cuota.socio.So_Nombre} ${cuota.socio.So_Apellido}` : '',
    So_DomCob: cuota.socio ? cuota.socio.So_DomCob : '',
    Gr_Titulo: cuota.socio?.grupo ? cuota.socio.grupo.Gr_Titulo : ''
  };
}

/**
 * GET /api/tirada/start/:start/end/:end
 * Get fee collection records by ID range
 */
router.get('/start/:start/end/:end', async (req, res) => {
  // Validate inputs
  const startValidation = validateNumber(req.params.start, 'start', 0, 999999999);
  if (!startValidation.valid) {
    return res.status(400).json({ error: 'Parámetro inválido', message: startValidation.error });
  }

  const endValidation = validateNumber(req.params.end, 'end', 0, 999999999);
  if (!endValidation.valid) {
    return res.status(400).json({ error: 'Parámetro inválido', message: endValidation.error });
  }

  const start = startValidation.value;
  const end = endValidation.value;

  // Validate range
  if (start > end) {
    return res.status(400).json({ error: 'Rango inválido', message: 'start debe ser menor o igual que end' });
  }

  // Limit range to prevent excessive queries
  if (end - start > 10000) {
    return res.status(400).json({ error: 'Rango demasiado grande', message: 'El rango máximo es de 10000 registros' });
  }

  try {
    // Query using Sequelize with eager loading
    const cuotas = await CobroCuota.findAll({
      where: {
        CC_ID: {
          [Op.between]: [start, end]
        },
        CC_Anulado: 'N',
        CC_Cobrado: {
          [Op.ne]: ''
        },
        CC_Debito: 'N'
      },
      include: [{
        model: Socio,
        as: 'socio',
        attributes: ['So_ID', 'So_Nombre', 'So_Apellido', 'So_DomCob', 'Gr_ID'],
        include: [{
          model: Grupo,
          as: 'grupo',
          attributes: ['Gr_Titulo']
        }]
      }],
      order: [['CC_ID', 'ASC']]
    });

    // Transform results to match original API format
    const results = cuotas.map(transformResult);
    res.json(results);

  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Error interno del servidor', message: 'Ocurrió un error al procesar tu solicitud' });
  }
});

/**
 * GET /api/tirada/start/:start/frompage/:frompage/topage/:topage
 * Get fee collection records by page range
 */
router.get('/start/:start/frompage/:frompage/topage/:topage', async (req, res) => {
  // Validate inputs
  const startValidation = validateNumber(req.params.start, 'start', 0, 999999999);
  if (!startValidation.valid) {
    return res.status(400).json({ error: 'Parámetro inválido', message: startValidation.error });
  }

  const frompageValidation = validateNumber(req.params.frompage, 'frompage', 1, 100000);
  if (!frompageValidation.valid) {
    return res.status(400).json({ error: 'Parámetro inválido', message: frompageValidation.error });
  }

  const topageValidation = validateNumber(req.params.topage, 'topage', 1, 100000);
  if (!topageValidation.valid) {
    return res.status(400).json({ error: 'Parámetro inválido', message: topageValidation.error });
  }

  const startBase = startValidation.value;
  const frompage = frompageValidation.value;
  const topage = topageValidation.value;

  // Validate page range
  if (frompage > topage) {
    return res.status(400).json({ error: 'Rango inválido', message: 'frompage debe ser menor o igual que topage' });
  }

  // Limit page range
  if (topage - frompage > 1000) {
    return res.status(400).json({ error: 'Rango demasiado grande', message: 'El rango máximo es de 1000 páginas' });
  }

  const start = startBase + (frompage - 1) * FEE_BY_PAGE;
  const end = startBase + (topage * FEE_BY_PAGE - 1);

  try {
    // Query using Sequelize with eager loading
    const cuotas = await CobroCuota.findAll({
      where: {
        CC_ID: {
          [Op.between]: [start, end]
        },
        CC_Anulado: 'N',
        CC_Cobrado: {
          [Op.ne]: ''
        },
        CC_Debito: 'N'
      },
      include: [{
        model: Socio,
        as: 'socio',
        attributes: ['So_ID', 'So_Nombre', 'So_Apellido', 'So_DomCob', 'Gr_ID'],
        include: [{
          model: Grupo,
          as: 'grupo',
          attributes: ['Gr_Titulo']
        }]
      }],
      order: [['CC_ID', 'ASC']]
    });

    // Transform results to match original API format
    const results = cuotas.map(transformResult);
    res.json(results);

  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Error interno del servidor', message: 'Ocurrió un error al procesar tu solicitud' });
  }
});

/**
 * GET /api/tirada/custom/:ccid1/:ccid2/:ccid3/:ccid4/:ccid5/:ccid6/:ccid7/:ccid8
 * Get fee collection records by specific IDs (8 IDs)
 */
router.get('/custom/:ccid1/:ccid2/:ccid3/:ccid4/:ccid5/:ccid6/:ccid7/:ccid8', async (req, res) => {
  // Validate all 8 IDs
  const ids = [];
  for (let i = 1; i <= 8; i++) {
    const paramName = `ccid${i}`;
    const validation = validateNumber(req.params[paramName], paramName, 0, 999999999);

    if (!validation.valid) {
      return res.status(400).json({ error: 'Parámetro inválido', message: validation.error });
    }

    ids.push(validation.value);
  }

  try {
    // Query using Sequelize with eager loading
    const cuotas = await CobroCuota.findAll({
      where: {
        CC_ID: {
          [Op.in]: ids
        },
        CC_Anulado: 'N',
        CC_Cobrado: {
          [Op.ne]: ''
        },
        CC_Debito: 'N'
      },
      include: [{
        model: Socio,
        as: 'socio',
        attributes: ['So_ID', 'So_Nombre', 'So_Apellido', 'So_DomCob', 'Gr_ID'],
        include: [{
          model: Grupo,
          as: 'grupo',
          attributes: ['Gr_Titulo']
        }]
      }],
      order: [['CC_ID', 'ASC']]
    });

    // Transform results to match original API format
    const results = cuotas.map(transformResult);
    res.json(results);

  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Error interno del servidor', message: 'Ocurrió un error al procesar tu solicitud' });
  }
});

module.exports = router;
