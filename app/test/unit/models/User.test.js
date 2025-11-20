/**
 * User Model Unit Tests
 */

const { User } = require('../../../models');
const { sequelize } = require('../../../config/database');
const testUsers = require('../../fixtures/users');

describe('User Model', () => {
  beforeAll(async () => {
    // Connect to test database
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // Drop and recreate tables
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear users table before each test
    await User.destroy({ where: {}, force: true });
  });

  describe('User Creation', () => {
    test('should create a valid user', async () => {
      const user = await User.create(testUsers.validUser);

      expect(user.id).toBeDefined();
      expect(user.username).toBe(testUsers.validUser.username);
      expect(user.email).toBe(testUsers.validUser.email);
      expect(user.role).toBe('user');
      expect(user.active).toBe(true);
    });

    test('should not allow duplicate usernames', async () => {
      await User.create(testUsers.validUser);

      await expect(
        User.create(testUsers.validUser)
      ).rejects.toThrow();
    });

    test('should validate username length', async () => {
      const invalidUser = {
        ...testUsers.validUser,
        username: 'ab' // Too short (min 3)
      };

      await expect(
        User.create(invalidUser)
      ).rejects.toThrow();
    });
  });

  describe('User.findByUsername()', () => {
    test('should find user by username', async () => {
      await User.create(testUsers.validUser);

      const user = await User.findByUsername(testUsers.validUser.username);

      expect(user).toBeDefined();
      expect(user.username).toBe(testUsers.validUser.username);
    });

    test('should return null for non-existent user', async () => {
      const user = await User.findByUsername('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('Account Lockout Methods', () => {
    test('isLocked() should return false for unlocked account', async () => {
      const user = await User.create(testUsers.validUser);

      expect(user.isLocked()).toBe(false);
    });

    test('isLocked() should return true for locked account', async () => {
      const user = await User.create(testUsers.lockedUser);

      expect(user.isLocked()).toBe(true);
    });

    test('isLocked() should return false if lock expired', async () => {
      const expiredLockUser = {
        ...testUsers.validUser,
        username: 'expiredlock',
        failed_attempts: 5,
        locked_until: new Date(Date.now() - 1000) // 1 second ago
      };

      const user = await User.create(expiredLockUser);

      expect(user.isLocked()).toBe(false);
    });

    test('getLockTimeRemaining() should return correct minutes', async () => {
      const user = await User.create(testUsers.lockedUser);
      const minutes = user.getLockTimeRemaining();

      expect(minutes).toBeGreaterThan(0);
      expect(minutes).toBeLessThanOrEqual(30);
    });

    test('incrementFailedAttempts() should increment counter', async () => {
      const user = await User.create(testUsers.validUser);

      await user.incrementFailedAttempts(5, 30);

      expect(user.failed_attempts).toBe(1);
      expect(user.locked_until).toBeNull();
    });

    test('incrementFailedAttempts() should lock account after max attempts', async () => {
      const user = await User.create({
        ...testUsers.validUser,
        username: 'testlock',
        failed_attempts: 4
      });

      await user.incrementFailedAttempts(5, 30);

      expect(user.failed_attempts).toBe(5);
      expect(user.locked_until).not.toBeNull();
      expect(user.isLocked()).toBe(true);
    });

    test('resetFailedAttempts() should reset counter and unlock', async () => {
      const user = await User.create(testUsers.lockedUser);

      await user.resetFailedAttempts();

      expect(user.failed_attempts).toBe(0);
      expect(user.locked_until).toBeNull();
      expect(user.last_failed_attempt).toBeNull();
      expect(user.last_login).not.toBeNull();
    });

    test('unlock() should unlock account', async () => {
      const user = await User.create(testUsers.lockedUser);

      await user.unlock();

      expect(user.failed_attempts).toBe(0);
      expect(user.locked_until).toBeNull();
      expect(user.last_failed_attempt).toBeNull();
    });
  });

  describe('User.getLockedAccounts()', () => {
    test('should return only locked accounts', async () => {
      await User.create(testUsers.validUser);
      await User.create(testUsers.lockedUser);

      const lockedAccounts = await User.getLockedAccounts();

      expect(lockedAccounts).toHaveLength(1);
      expect(lockedAccounts[0].username).toBe(testUsers.lockedUser.username);
    });

    test('should return empty array if no locked accounts', async () => {
      await User.create(testUsers.validUser);

      const lockedAccounts = await User.getLockedAccounts();

      expect(lockedAccounts).toHaveLength(0);
    });
  });
});
