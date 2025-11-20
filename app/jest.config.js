/**
 * Jest Configuration
 * Testing configuration for biblio-server API
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    '!models/index.js',
    '!**/node_modules/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test match patterns
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Force exit
  forceExit: true,

  // Clear mocks
  clearMocks: true,

  // Reset mocks
  resetMocks: true,

  // Restore mocks
  restoreMocks: true
};
