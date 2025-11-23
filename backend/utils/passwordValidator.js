/**
 * Password Validator Utility
 * Provides comprehensive password validation with detailed feedback
 */

/**
 * Password validation rules configuration
 */
const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  minNumbers: 2,
  minUppercase: 1,
  minLowercase: 1,
  minSpecialChars: 1,
  specialCharsPattern: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/,
  allowSpaces: false
};

/**
 * Validate password strength with detailed feedback
 * Returns object with:
 * - valid: boolean (true if all requirements met)
 * - score: number 0-100 (password strength score)
 * - strength: string ('weak', 'fair', 'good', 'strong', 'excellent')
 * - requirements: array of requirement objects with status
 * - message: string (summary message)
 *
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with detailed feedback
 */
function validatePasswordStrength(password) {
  // Initialize result
  const result = {
    valid: false,
    score: 0,
    strength: 'weak',
    requirements: [],
    message: '',
    feedback: []
  };

  // Check if password exists
  if (!password || typeof password !== 'string') {
    result.message = 'Se requiere una contraseña';
    result.requirements.push({
      name: 'required',
      label: 'Contraseña proporcionada',
      met: false,
      required: true
    });
    return result;
  }

  let metRequirements = 0;
  const totalRequirements = 7; // Total number of requirements

  // Requirement 1: Minimum length
  const hasMinLength = password.length >= PASSWORD_RULES.minLength;
  result.requirements.push({
    name: 'minLength',
    label: `Mínimo ${PASSWORD_RULES.minLength} caracteres`,
    met: hasMinLength,
    required: true,
    current: password.length,
    expected: PASSWORD_RULES.minLength
  });
  if (hasMinLength) {
    metRequirements++;
    result.score += 15;
  } else {
    const remaining = PASSWORD_RULES.minLength - password.length;
    result.feedback.push(`Agrega ${remaining} caracter${remaining !== 1 ? 'es' : ''} más`);
  }

  // Requirement 2: Maximum length
  const hasMaxLength = password.length <= PASSWORD_RULES.maxLength;
  result.requirements.push({
    name: 'maxLength',
    label: `Menos de ${PASSWORD_RULES.maxLength} caracteres`,
    met: hasMaxLength,
    required: true,
    current: password.length,
    expected: PASSWORD_RULES.maxLength
  });
  if (hasMaxLength) {
    metRequirements++;
    result.score += 5;
  } else {
    result.feedback.push(`La contraseña es demasiado larga (máximo ${PASSWORD_RULES.maxLength} caracteres)`);
  }

  // Requirement 3: No spaces
  const hasNoSpaces = !PASSWORD_RULES.allowSpaces ? !/\s/.test(password) : true;
  result.requirements.push({
    name: 'noSpaces',
    label: 'Sin espacios',
    met: hasNoSpaces,
    required: true
  });
  if (hasNoSpaces) {
    metRequirements++;
    result.score += 5;
  } else {
    result.feedback.push('Elimina los espacios de la contraseña');
  }

  // Requirement 4: Uppercase letters
  const uppercaseMatches = password.match(/[A-Z]/g);
  const uppercaseCount = uppercaseMatches ? uppercaseMatches.length : 0;
  const hasUppercase = uppercaseCount >= PASSWORD_RULES.minUppercase;
  result.requirements.push({
    name: 'uppercase',
    label: `Mínimo ${PASSWORD_RULES.minUppercase} letra mayúscula`,
    met: hasUppercase,
    required: true,
    current: uppercaseCount,
    expected: PASSWORD_RULES.minUppercase
  });
  if (hasUppercase) {
    metRequirements++;
    result.score += 15;
    // Bonus for multiple uppercase
    if (uppercaseCount > 2) result.score += 5;
  } else {
    result.feedback.push('Agrega una letra mayúscula (A-Z)');
  }

  // Requirement 5: Lowercase letters
  const lowercaseMatches = password.match(/[a-z]/g);
  const lowercaseCount = lowercaseMatches ? lowercaseMatches.length : 0;
  const hasLowercase = lowercaseCount >= PASSWORD_RULES.minLowercase;
  result.requirements.push({
    name: 'lowercase',
    label: `Mínimo ${PASSWORD_RULES.minLowercase} letra minúscula`,
    met: hasLowercase,
    required: true,
    current: lowercaseCount,
    expected: PASSWORD_RULES.minLowercase
  });
  if (hasLowercase) {
    metRequirements++;
    result.score += 15;
    // Bonus for multiple lowercase
    if (lowercaseCount > 4) result.score += 5;
  } else {
    result.feedback.push('Agrega una letra minúscula (a-z)');
  }

  // Requirement 6: Numbers
  const numberMatches = password.match(/[0-9]/g);
  const numberCount = numberMatches ? numberMatches.length : 0;
  const hasNumbers = numberCount >= PASSWORD_RULES.minNumbers;
  result.requirements.push({
    name: 'numbers',
    label: `Mínimo ${PASSWORD_RULES.minNumbers} números`,
    met: hasNumbers,
    required: true,
    current: numberCount,
    expected: PASSWORD_RULES.minNumbers
  });
  if (hasNumbers) {
    metRequirements++;
    result.score += 20;
    // Bonus for multiple numbers
    if (numberCount > 3) result.score += 5;
  } else {
    const needed = PASSWORD_RULES.minNumbers - numberCount;
    result.feedback.push(`Agrega ${needed} número${needed !== 1 ? 's' : ''} más`);
  }

  // Requirement 7: Special characters
  const specialMatches = password.match(PASSWORD_RULES.specialCharsPattern);
  const specialCount = specialMatches ? specialMatches.length : 0;
  const hasSpecialChars = specialCount >= PASSWORD_RULES.minSpecialChars;
  result.requirements.push({
    name: 'specialChars',
    label: `Mínimo ${PASSWORD_RULES.minSpecialChars} carácter especial`,
    met: hasSpecialChars,
    required: true,
    current: specialCount,
    expected: PASSWORD_RULES.minSpecialChars,
    examples: '!@#$%^&*()_+-=[]{};\':"|,.<>/?~`'
  });
  if (hasSpecialChars) {
    metRequirements++;
    result.score += 20;
    // Bonus for multiple special chars
    if (specialCount > 2) result.score += 5;
  } else {
    result.feedback.push('Agrega un carácter especial (!@#$%^&*...)');
  }

  // Additional scoring for length
  if (password.length >= 12) result.score += 5;
  if (password.length >= 16) result.score += 5;
  if (password.length >= 20) result.score += 5;

  // Check for common patterns (reduce score)
  const commonPatterns = [
    /^[a-zA-Z]+$/, // Only letters
    /^[0-9]+$/, // Only numbers
    /^(.)\1+$/, // Repeated characters (aaa, 111)
    /123|234|345|456|567|678|789/, // Sequential numbers
    /abc|bcd|cde|def|efg|fgh|ghi/i, // Sequential letters
    /password|qwerty|admin|letmein|welcome/i, // Common words
  ];

  let patternPenalty = 0;
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      patternPenalty += 10;
    }
  }
  result.score = Math.max(0, result.score - patternPenalty);

  // Cap score at 100
  result.score = Math.min(100, result.score);

  // Determine strength based on score
  if (result.score >= 90) {
    result.strength = 'excellent';
  } else if (result.score >= 70) {
    result.strength = 'strong';
  } else if (result.score >= 50) {
    result.strength = 'good';
  } else if (result.score >= 30) {
    result.strength = 'fair';
  } else {
    result.strength = 'weak';
  }

  // Check if all REQUIRED requirements are met
  const allRequiredMet = result.requirements
    .filter(req => req.required)
    .every(req => req.met);

  result.valid = allRequiredMet;

  // Generate message
  if (result.valid) {
    result.message = `La contraseña es ${result.strength} (${result.score}/100)`;
  } else {
    const unmetCount = totalRequirements - metRequirements;
    result.message = `La contraseña no cumple los requisitos (${unmetCount} requisito${unmetCount !== 1 ? 's' : ''} no cumplido${unmetCount !== 1 ? 's' : ''})`;
  }

  return result;
}

/**
 * Simple password validation (backward compatible)
 * Returns { valid: boolean, message: string }
 *
 * @param {string} password - Password to validate
 * @returns {Object} { valid, message }
 */
function validatePassword(password) {
  const result = validatePasswordStrength(password);

  if (!result.valid) {
    // Return first unmet requirement message
    const firstUnmet = result.requirements.find(req => !req.met);
    return {
      valid: false,
      message: firstUnmet ? firstUnmet.label : result.message
    };
  }

  return {
    valid: true,
    message: 'La contraseña cumple todos los requisitos'
  };
}

/**
 * Get password requirements configuration
 * @returns {Object} Password rules
 */
function getPasswordRequirements() {
  return {
    minLength: PASSWORD_RULES.minLength,
    maxLength: PASSWORD_RULES.maxLength,
    minNumbers: PASSWORD_RULES.minNumbers,
    minUppercase: PASSWORD_RULES.minUppercase,
    minLowercase: PASSWORD_RULES.minLowercase,
    minSpecialChars: PASSWORD_RULES.minSpecialChars,
    specialCharsExamples: '!@#$%^&*()_+-=[]{};\':"|,.<>/?~`',
    allowSpaces: PASSWORD_RULES.allowSpaces
  };
}

module.exports = {
  validatePasswordStrength,
  validatePassword,
  getPasswordRequirements,
  PASSWORD_RULES
};
