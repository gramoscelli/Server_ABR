/**
 * ApiKey Model Unit Tests
 */

const { ApiKey, User } = require('../../../models');
const { sequelize } = require('../../../config/database');
const testUsers = require('../../fixtures/users');

describe('ApiKey Model', () => {
  let testUser;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await ApiKey.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create a test user
    testUser = await User.create(testUsers.validUser);
  });

  describe('ApiKey Creation', () => {
    test('should create a valid API key', async () => {
      const apiKey = await ApiKey.create({
        key_hash: 'test-hash-123',
        name: 'Test API Key',
        user_id: testUser.id,
        active: true
      });

      expect(apiKey.id).toBeDefined();
      expect(apiKey.name).toBe('Test API Key');
      expect(apiKey.user_id).toBe(testUser.id);
      expect(apiKey.active).toBe(true);
    });

    test('should allow API key without user_id', async () => {
      const apiKey = await ApiKey.create({
        key_hash: 'test-hash-456',
        name: 'Service API Key',
        user_id: null,
        active: true
      });

      expect(apiKey.user_id).toBeNull();
    });
  });

  describe('ApiKey Validation Methods', () => {
    test('isExpired() should return false for non-expiring key', async () => {
      const apiKey = await ApiKey.create({
        key_hash: 'test-hash',
        name: 'Test Key',
        user_id: testUser.id,
        expires_at: null
      });

      expect(apiKey.isExpired()).toBe(false);
    });

    test('isExpired() should return false for future expiration', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const apiKey = await ApiKey.create({
        key_hash: 'test-hash',
        name: 'Test Key',
        user_id: testUser.id,
        expires_at: futureDate
      });

      expect(apiKey.isExpired()).toBe(false);
    });

    test('isExpired() should return true for past expiration', async () => {
      const pastDate = new Date(Date.now() - 1000);

      const apiKey = await ApiKey.create({
        key_hash: 'test-hash',
        name: 'Test Key',
        user_id: testUser.id,
        expires_at: pastDate
      });

      expect(apiKey.isExpired()).toBe(true);
    });

    test('isValid() should return true for active non-expired key', async () => {
      const apiKey = await ApiKey.create({
        key_hash: 'test-hash',
        name: 'Test Key',
        user_id: testUser.id,
        active: true,
        expires_at: null
      });

      expect(apiKey.isValid()).toBe(true);
    });

    test('isValid() should return false for inactive key', async () => {
      const apiKey = await ApiKey.create({
        key_hash: 'test-hash',
        name: 'Test Key',
        user_id: testUser.id,
        active: false
      });

      expect(apiKey.isValid()).toBe(false);
    });

    test('isValid() should return false for expired key', async () => {
      const pastDate = new Date(Date.now() - 1000);

      const apiKey = await ApiKey.create({
        key_hash: 'test-hash',
        name: 'Test Key',
        user_id: testUser.id,
        active: true,
        expires_at: pastDate
      });

      expect(apiKey.isValid()).toBe(false);
    });
  });

  describe('ApiKey Instance Methods', () => {
    test('updateLastUsed() should update timestamp', async () => {
      const apiKey = await ApiKey.create({
        key_hash: 'test-hash',
        name: 'Test Key',
        user_id: testUser.id
      });

      expect(apiKey.last_used).toBeNull();

      await apiKey.updateLastUsed();

      expect(apiKey.last_used).not.toBeNull();
    });

    test('deactivate() should set active to false', async () => {
      const apiKey = await ApiKey.create({
        key_hash: 'test-hash',
        name: 'Test Key',
        user_id: testUser.id,
        active: true
      });

      await apiKey.deactivate();

      expect(apiKey.active).toBe(false);
    });
  });

  describe('ApiKey Class Methods', () => {
    test('findActiveByUserId() should return only active keys for user', async () => {
      await ApiKey.create({
        key_hash: 'active-key',
        name: 'Active Key',
        user_id: testUser.id,
        active: true
      });

      await ApiKey.create({
        key_hash: 'inactive-key',
        name: 'Inactive Key',
        user_id: testUser.id,
        active: false
      });

      const activeKeys = await ApiKey.findActiveByUserId(testUser.id);

      expect(activeKeys).toHaveLength(1);
      expect(activeKeys[0].name).toBe('Active Key');
    });

    test('findByHash() should find API key by hash', async () => {
      await ApiKey.create({
        key_hash: 'unique-hash-123',
        name: 'Test Key',
        user_id: testUser.id
      });

      const apiKey = await ApiKey.findByHash('unique-hash-123');

      expect(apiKey).not.toBeNull();
      expect(apiKey.name).toBe('Test Key');
    });

    test('cleanupExpired() should deactivate expired keys', async () => {
      const pastDate = new Date(Date.now() - 1000);

      await ApiKey.create({
        key_hash: 'expired-key',
        name: 'Expired Key',
        user_id: testUser.id,
        active: true,
        expires_at: pastDate
      });

      const count = await ApiKey.cleanupExpired();

      expect(count).toBe(1);

      const key = await ApiKey.findByHash('expired-key');
      expect(key.active).toBe(false);
    });
  });
});
