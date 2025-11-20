/**
 * Username Validator Utility
 * Provides username validation with detailed feedback
 */

/**
 * Username validation rules configuration
 */
const USERNAME_RULES = {
  minLength: 3,
  maxLength: 20,
  allowedPattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
  reservedUsernames: [
    'admin', 'root', 'administrator', 'moderator', 'mod',
    'system', 'api', 'null', 'undefined', 'guest', 'test',
    'superuser', 'sysadmin', 'webmaster', 'postmaster'
  ]
};

/**
 * Validate username format and rules
 * Returns object with:
 * - valid: boolean (true if all requirements met)
 * - requirements: array of requirement objects with status
 * - message: string (summary message)
 * - feedback: string[] (suggestions for improvement)
 *
 * @param {string} username - Username to validate
 * @returns {Object} Validation result with detailed feedback
 */
function validateUsernameFormat(username) {
  const result = {
    valid: false,
    requirements: [],
    message: '',
    feedback: []
  };

  // Check if username exists
  if (!username || typeof username !== 'string') {
    result.message = 'Se requiere un nombre de usuario';
    result.requirements.push({
      name: 'required',
      label: 'Nombre de usuario proporcionado',
      met: false,
      required: true
    });
    return result;
  }

  const username_trimmed = username.trim();
  let allRequirementsMet = true;

  // Requirement 1: Minimum length
  const hasMinLength = username_trimmed.length >= USERNAME_RULES.minLength;
  result.requirements.push({
    name: 'minLength',
    label: `Mínimo ${USERNAME_RULES.minLength} caracteres`,
    met: hasMinLength,
    required: true,
    current: username_trimmed.length,
    expected: USERNAME_RULES.minLength
  });
  if (!hasMinLength) {
    allRequirementsMet = false;
    const remaining = USERNAME_RULES.minLength - username_trimmed.length;
    result.feedback.push(`Agrega ${remaining} caracter${remaining !== 1 ? 'es' : ''} más`);
  }

  // Requirement 2: Maximum length
  const hasMaxLength = username_trimmed.length <= USERNAME_RULES.maxLength;
  result.requirements.push({
    name: 'maxLength',
    label: `Máximo ${USERNAME_RULES.maxLength} caracteres`,
    met: hasMaxLength,
    required: true,
    current: username_trimmed.length,
    expected: USERNAME_RULES.maxLength
  });
  if (!hasMaxLength) {
    allRequirementsMet = false;
    result.feedback.push(`El nombre es demasiado largo (máximo ${USERNAME_RULES.maxLength} caracteres)`);
  }

  // Requirement 3: Must start with a letter
  const startsWithLetter = /^[a-zA-Z]/.test(username_trimmed);
  result.requirements.push({
    name: 'startsWithLetter',
    label: 'Debe comenzar con una letra',
    met: startsWithLetter,
    required: true
  });
  if (!startsWithLetter) {
    allRequirementsMet = false;
    result.feedback.push('El nombre debe comenzar con una letra (a-z, A-Z)');
  }

  // Requirement 4: Only allowed characters (letters, numbers, underscore, hyphen)
  const hasValidChars = USERNAME_RULES.allowedPattern.test(username_trimmed);
  result.requirements.push({
    name: 'validChars',
    label: 'Solo letras, números, guión (-) y guión bajo (_)',
    met: hasValidChars,
    required: true
  });
  if (!hasValidChars) {
    allRequirementsMet = false;
    result.feedback.push('Usa solo letras, números, guión (-) o guión bajo (_)');
  }

  // Requirement 5: No spaces
  const hasNoSpaces = !/\s/.test(username_trimmed);
  result.requirements.push({
    name: 'noSpaces',
    label: 'Sin espacios',
    met: hasNoSpaces,
    required: true
  });
  if (!hasNoSpaces) {
    allRequirementsMet = false;
    result.feedback.push('El nombre no puede contener espacios');
  }

  // Requirement 6: Not a reserved username
  const isNotReserved = !USERNAME_RULES.reservedUsernames.includes(username_trimmed.toLowerCase());
  result.requirements.push({
    name: 'notReserved',
    label: 'No es un nombre reservado',
    met: isNotReserved,
    required: true
  });
  if (!isNotReserved) {
    allRequirementsMet = false;
    result.feedback.push('Este nombre de usuario está reservado, por favor elige otro');
  }

  result.valid = allRequirementsMet;

  // Generate message
  if (result.valid) {
    result.message = 'El nombre de usuario es válido';
  } else {
    const unmetCount = result.requirements.filter(req => !req.met).length;
    result.message = `El nombre de usuario no cumple los requisitos (${unmetCount} requisito${unmetCount !== 1 ? 's' : ''} no cumplido${unmetCount !== 1 ? 's' : ''})`;
  }

  return result;
}

/**
 * Check if username is available (not already taken)
 * This function should be called from the route after format validation
 *
 * @param {string} username - Username to check
 * @param {Object} db - Database connection
 * @returns {Promise<Object>} { available: boolean, message: string }
 */
async function checkUsernameAvailability(username, db) {
  try {
    const [rows] = await db.query(
      'SELECT id FROM usuarios WHERE username = ?',
      [username]
    );

    const available = rows.length === 0;

    return {
      available,
      message: available
        ? 'El nombre de usuario está disponible'
        : 'El nombre de usuario ya está en uso'
    };
  } catch (error) {
    console.error('Error checking username availability:', error);
    throw error;
  }
}

/**
 * Get username requirements configuration
 * @returns {Object} Username rules
 */
function getUsernameRequirements() {
  return {
    minLength: USERNAME_RULES.minLength,
    maxLength: USERNAME_RULES.maxLength,
    pattern: USERNAME_RULES.allowedPattern.toString(),
    reservedCount: USERNAME_RULES.reservedUsernames.length
  };
}

module.exports = {
  validateUsernameFormat,
  checkUsernameAvailability,
  getUsernameRequirements,
  USERNAME_RULES
};
