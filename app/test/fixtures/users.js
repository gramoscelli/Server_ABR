/**
 * User Test Fixtures
 * Sample user data for testing
 */

const bcrypt = require('bcryptjs');

// Pre-hashed passwords for testing (bcrypt with 10 rounds)
const passwordHash = bcrypt.hashSync('password123', 10);
const adminPasswordHash = bcrypt.hashSync('admin123', 10);

const testUsers = {
  validUser: {
    username: 'testuser',
    password: 'password123',
    password_hash: passwordHash,
    email: 'testuser@example.com',
    role: 'user',
    active: true
  },

  adminUser: {
    username: 'testadmin',
    password: 'admin123',
    password_hash: adminPasswordHash,
    email: 'admin@example.com',
    role: 'admin',
    active: true
  },

  lockedUser: {
    username: 'lockeduser',
    password: 'password123',
    password_hash: passwordHash,
    email: 'locked@example.com',
    role: 'user',
    active: true,
    failed_attempts: 5,
    locked_until: new Date(Date.now() + 30 * 60000) // 30 minutes from now
  },

  inactiveUser: {
    username: 'inactiveuser',
    password: 'password123',
    password_hash: passwordHash,
    email: 'inactive@example.com',
    role: 'user',
    active: false
  }
};

module.exports = testUsers;
