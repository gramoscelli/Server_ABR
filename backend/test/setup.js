/**
 * Jest Test Setup
 * Global setup for all tests
 */

// Set test environment variables
// Load from .env file if available
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-purposes-only-do-not-use-in-production';

// For tests running outside Docker, convert 'mysql' hostname to 'localhost'
const dbHost = process.env.TEST_MYSQL_HOST || process.env.MYSQL_HOST || 'localhost';
process.env.MYSQL_HOST = dbHost === 'mysql' ? 'localhost' : dbHost;

process.env.MYSQL_PORT = process.env.TEST_MYSQL_PORT || process.env.MYSQL_PORT || '3306';
process.env.MYSQL_USER = process.env.TEST_MYSQL_USER || process.env.MYSQL_USER || 'root';
process.env.MYSQL_PASSWORD = process.env.TEST_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || 'password';
process.env.MYSQL_DATABASE = process.env.TEST_MYSQL_DATABASE || process.env.MYSQL_DATABASE || 'biblio_test';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost';

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn() // Keep error for debugging
};
