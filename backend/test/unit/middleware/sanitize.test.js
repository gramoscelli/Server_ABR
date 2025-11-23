/**
 * Sanitization Middleware Unit Tests
 */

const {
  sanitizeString,
  sanitizeUsername,
  sanitizeEmail,
  sanitizeName,
  sanitizeUrl,
  sanitizeInteger,
  sanitizeBoolean,
  validatePassword
} = require('../../../middleware/sanitize');

describe('Sanitization Middleware', () => {
  describe('sanitizeString()', () => {
    test('should escape HTML characters', () => {
      const input = '<script>alert("XSS")</script>';
      const result = sanitizeString(input);

      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(result).not.toContain('<script>');
    });

    test('should trim whitespace', () => {
      const input = '  hello world  ';
      const result = sanitizeString(input);

      expect(result).toBe('hello world');
    });

    test('should remove null bytes', () => {
      const input = 'hello\0world';
      const result = sanitizeString(input);

      expect(result).not.toContain('\0');
    });

    test('should limit length', () => {
      const input = 'a'.repeat(2000);
      const result = sanitizeString(input, { maxLength: 100 });

      expect(result.length).toBe(100);
    });

    test('should return empty string for empty input when not allowed', () => {
      const result = sanitizeString('   ', { allowEmpty: false });

      expect(result).toBe('');
    });
  });

  describe('sanitizeUsername()', () => {
    test('should allow valid username', () => {
      const result = sanitizeUsername('user_name-123');

      expect(result).toBe('user_name-123');
    });

    test('should remove invalid characters', () => {
      const result = sanitizeUsername('user<script>@#$');

      expect(result).toBe('userscript');
    });

    test('should trim whitespace', () => {
      const result = sanitizeUsername('  username  ');

      expect(result).toBe('username');
    });

    test('should return null for too short username', () => {
      const result = sanitizeUsername('ab');

      expect(result).toBeNull();
    });

    test('should return null for empty username', () => {
      const result = sanitizeUsername('');

      expect(result).toBeNull();
    });

    test('should truncate long username', () => {
      const longUsername = 'a'.repeat(100);
      const result = sanitizeUsername(longUsername);

      expect(result.length).toBe(50);
    });

    test('should allow dots and hyphens', () => {
      const result = sanitizeUsername('john.doe-123');

      expect(result).toBe('john.doe-123');
    });
  });

  describe('sanitizeEmail()', () => {
    test('should validate and normalize email', () => {
      const result = sanitizeEmail('USER@EXAMPLE.COM');

      expect(result).toBe('user@example.com');
    });

    test('should return null for invalid email', () => {
      const result = sanitizeEmail('not-an-email');

      expect(result).toBeNull();
    });

    test('should return null for email with script', () => {
      const result = sanitizeEmail('<script>@example.com');

      expect(result).toBeNull();
    });

    test('should normalize Gmail addresses', () => {
      const result = sanitizeEmail('Test.User@gmail.com');

      expect(result).toBeTruthy();
      expect(result).toContain('@gmail.com');
    });
  });

  describe('sanitizeName()', () => {
    test('should allow valid names', () => {
      const result = sanitizeName('John Doe');

      expect(result).toBe('John Doe');
    });

    test('should allow hyphens and apostrophes', () => {
      const result = sanitizeName("Mary-Jane O'Connor");

      expect(result).toBe('Mary-Jane O&#x27;Connor');
    });

    test('should remove numbers and special characters', () => {
      const result = sanitizeName('John123!@#');

      expect(result).toBe('John');
    });

    test('should return null for empty name', () => {
      const result = sanitizeName('   ');

      expect(result).toBeNull();
    });

    test('should truncate long names', () => {
      const longName = 'a'.repeat(200);
      const result = sanitizeName(longName);

      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('sanitizeUrl()', () => {
    test('should allow valid HTTP URL', () => {
      const result = sanitizeUrl('http://example.com');

      expect(result).toBe('http://example.com');
    });

    test('should allow valid HTTPS URL', () => {
      const result = sanitizeUrl('https://example.com/path?query=1');

      expect(result).toBe('https://example.com/path?query=1');
    });

    test('should return null for invalid URL', () => {
      const result = sanitizeUrl('not a url');

      expect(result).toBeNull();
    });

    test('should return null for URL without protocol', () => {
      const result = sanitizeUrl('example.com');

      expect(result).toBeNull();
    });

    test('should return null for JavaScript protocol', () => {
      const result = sanitizeUrl('javascript:alert(1)');

      expect(result).toBeNull();
    });
  });

  describe('sanitizeInteger()', () => {
    test('should parse valid integer', () => {
      const result = sanitizeInteger('123');

      expect(result).toBe(123);
    });

    test('should return null for non-numeric input', () => {
      const result = sanitizeInteger('abc');

      expect(result).toBeNull();
    });

    test('should enforce minimum value', () => {
      const result = sanitizeInteger('5', 10, 100);

      expect(result).toBeNull();
    });

    test('should enforce maximum value', () => {
      const result = sanitizeInteger('150', 0, 100);

      expect(result).toBeNull();
    });

    test('should allow value within range', () => {
      const result = sanitizeInteger('50', 0, 100);

      expect(result).toBe(50);
    });

    test('should parse numeric input', () => {
      const result = sanitizeInteger(42);

      expect(result).toBe(42);
    });
  });

  describe('sanitizeBoolean()', () => {
    test('should return true for boolean true', () => {
      const result = sanitizeBoolean(true);

      expect(result).toBe(true);
    });

    test('should return false for boolean false', () => {
      const result = sanitizeBoolean(false);

      expect(result).toBe(false);
    });

    test('should return true for string "true"', () => {
      const result = sanitizeBoolean('true');

      expect(result).toBe(true);
    });

    test('should return false for string "false"', () => {
      const result = sanitizeBoolean('false');

      expect(result).toBe(false);
    });

    test('should return true for "1"', () => {
      const result = sanitizeBoolean('1');

      expect(result).toBe(true);
    });

    test('should return false for "0"', () => {
      const result = sanitizeBoolean('0');

      expect(result).toBe(false);
    });

    test('should return true for number 1', () => {
      const result = sanitizeBoolean(1);

      expect(result).toBe(true);
    });

    test('should return false for number 0', () => {
      const result = sanitizeBoolean(0);

      expect(result).toBe(false);
    });

    test('should return null for invalid input', () => {
      const result = sanitizeBoolean('invalid');

      expect(result).toBeNull();
    });
  });

  describe('validatePassword()', () => {
    test('should accept valid strong password', () => {
      const result = validatePassword('Pass12@word');

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Password is valid');
    });

    test('should accept password with all requirements', () => {
      const result = validatePassword('MyP@ssw0rd99');

      expect(result.valid).toBe(true);
    });

    test('should accept complex password', () => {
      const result = validatePassword('Str0ng!P@ss99');

      expect(result.valid).toBe(true);
    });

    test('should accept password with multiple special characters', () => {
      const result = validatePassword('P@ssw0rd!#99');

      expect(result.valid).toBe(true);
    });

    test('should accept long strong password', () => {
      const result = validatePassword('Aa12@' + 'x'.repeat(50));

      expect(result.valid).toBe(true);
    });

    test('should reject password shorter than 8 characters', () => {
      const result = validatePassword('Pass1@a');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must be at least 8 characters long');
    });

    test('should reject password with only lowercase', () => {
      const result = validatePassword('password12@');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must contain at least one uppercase letter');
    });

    test('should reject password with only uppercase', () => {
      const result = validatePassword('PASSWORD12@');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must contain at least one lowercase letter');
    });

    test('should reject password without numbers', () => {
      const result = validatePassword('Password@');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must contain at least 2 numbers');
    });

    test('should reject password with only one number', () => {
      const result = validatePassword('Password1@');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must contain at least 2 numbers');
    });

    test('should reject password without special character', () => {
      const result = validatePassword('Password12');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Password must contain at least 1 special character');
    });

    test('should reject empty password', () => {
      const result = validatePassword('');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password is required');
    });

    test('should reject null password', () => {
      const result = validatePassword(null);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password is required');
    });

    test('should reject undefined password', () => {
      const result = validatePassword(undefined);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password is required');
    });

    test('should reject password longer than 128 characters', () => {
      const result = validatePassword('a'.repeat(129));

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must be less than 128 characters long');
    });

    test('should reject password with spaces', () => {
      const result = validatePassword('pass word');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password cannot contain spaces');
    });

    test('should reject password with leading space', () => {
      const result = validatePassword(' password');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password cannot contain spaces');
    });

    test('should reject password with trailing space', () => {
      const result = validatePassword('password ');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password cannot contain spaces');
    });

    test('should reject password with tabs', () => {
      const result = validatePassword('Pass12@\tword');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password cannot contain spaces');
    });

    test('should reject password with newlines', () => {
      const result = validatePassword('Pass12@\nword');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password cannot contain spaces');
    });

    test('should accept password with exactly 8 characters meeting all requirements', () => {
      const result = validatePassword('Pass12@#');

      expect(result.valid).toBe(true);
    });

    test('should accept password with exactly 128 characters', () => {
      const result = validatePassword('Aa12@' + 'x'.repeat(123));

      expect(result.valid).toBe(true);
    });

    test('should reject non-string password', () => {
      const result = validatePassword(123456);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password is required');
    });
  });
});
