/**
 * Encoding utilities for fixing Latin1/UTF-8 mojibake issues
 * Common in legacy databases with mixed encodings
 */

/**
 * Fix encoding issues - converts double-encoded UTF-8 (mojibake) to proper UTF-8
 * Detects patterns like "Ã±" (which should be "ñ") or "Ã³" (which should be "ó")
 *
 * @param {string} text - Text that may have encoding issues
 * @returns {string} - Fixed text with proper UTF-8 encoding
 */
function fixEncoding(text) {
  if (!text || typeof text !== 'string') return text;

  // Fix specific mojibake patterns
  // These occur when UTF-8 data (C3 xx bytes) is misinterpreted as Latin1
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
    'Ã¤': 'ä',       // C3 A4
    'Ã¶': 'ö',       // C3 B6
    'Ã': 'Ä',       // C3 84
    'Ã–': 'Ö',       // C3 96
    'Ã§': 'ç',       // C3 A7
    'Ã‡': 'Ç',       // C3 87
  };

  for (const [wrong, correct] of Object.entries(replacements)) {
    if (fixed.includes(wrong)) {
      fixed = fixed.replace(new RegExp(wrong, 'g'), correct);
    }
  }

  return fixed;
}

/**
 * Fix encoding for all string fields in an object
 *
 * @param {Object} obj - Object with potential encoding issues
 * @param {string[]} fields - List of field names to fix
 * @returns {Object} - Object with fixed encoding
 */
function fixEncodingFields(obj, fields) {
  if (!obj) return obj;

  const fixed = { ...obj };
  fields.forEach(field => {
    if (fixed[field]) {
      fixed[field] = fixEncoding(fixed[field]);
    }
  });

  return fixed;
}

/**
 * Fix encoding for a Sequelize model instance
 * Converts to JSON and fixes specified fields
 *
 * @param {Object} instance - Sequelize model instance
 * @param {string[]} fields - List of field names to fix
 * @returns {Object} - Plain object with fixed encoding
 */
function fixModelEncoding(instance, fields) {
  if (!instance) return instance;

  const json = instance.toJSON ? instance.toJSON() : instance;
  return fixEncodingFields(json, fields);
}

/**
 * Fix encoding for an array of Sequelize model instances
 *
 * @param {Object[]} instances - Array of Sequelize model instances
 * @param {string[]} fields - List of field names to fix
 * @returns {Object[]} - Array of plain objects with fixed encoding
 */
function fixArrayEncoding(instances, fields) {
  if (!instances || !Array.isArray(instances)) return instances;

  return instances.map(instance => fixModelEncoding(instance, fields));
}

module.exports = {
  fixEncoding,
  fixEncodingFields,
  fixModelEncoding,
  fixArrayEncoding
};
