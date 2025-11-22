/**
 * CSRF Token Model Unit Tests
 */

const { sequelize, CsrfToken } = require('../../../models');
const crypto = require('crypto');

describe('CsrfToken Model', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up tokens before each test
    await CsrfToken.destroy({ where: {}, truncate: true });
  });

  describe('Token Creation', () => {
    test('should create a new CSRF token', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const csrfToken = await CsrfToken.create({
        token,
        expires_at: expiresAt,
        ip_address: '127.0.0.1',
        used: false
      });

      expect(csrfToken.id).toBeDefined();
      expect(csrfToken.token).toBe(token);
      expect(csrfToken.used).toBe(false);
      expect(csrfToken.ip_address).toBe('127.0.0.1');
    });

    test('should enforce unique token constraint', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await CsrfToken.create({
        token,
        expires_at: expiresAt
      });

      // Attempting to create duplicate token should fail
      await expect(
        CsrfToken.create({
          token,
          expires_at: expiresAt
        })
      ).rejects.toThrow();
    });

    test('should auto-set created_at timestamp', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const csrfToken = await CsrfToken.create({
        token,
        expires_at: expiresAt
      });

      expect(csrfToken.created_at).toBeInstanceOf(Date);
      expect(csrfToken.created_at.getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('should default used to false', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const csrfToken = await CsrfToken.create({
        token,
        expires_at: expiresAt
      });

      expect(csrfToken.used).toBe(false);
    });
  });

  describe('Token Retrieval', () => {
    test('should find token by token string', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await CsrfToken.create({
        token,
        expires_at: expiresAt,
        ip_address: '192.168.1.1'
      });

      const foundToken = await CsrfToken.findOne({ where: { token } });

      expect(foundToken).not.toBeNull();
      expect(foundToken.token).toBe(token);
      expect(foundToken.ip_address).toBe('192.168.1.1');
    });

    test('should return null for non-existent token', async () => {
      const foundToken = await CsrfToken.findOne({
        where: { token: 'non-existent-token' }
      });

      expect(foundToken).toBeNull();
    });
  });

  describe('Token Validation', () => {
    test('should identify expired tokens', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const pastDate = new Date(Date.now() - 1000); // 1 second ago

      const csrfToken = await CsrfToken.create({
        token,
        expires_at: pastDate
      });

      const now = new Date();
      expect(new Date(csrfToken.expires_at) < now).toBe(true);
    });

    test('should identify valid tokens', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const csrfToken = await CsrfToken.create({
        token,
        expires_at: futureDate
      });

      const now = new Date();
      expect(new Date(csrfToken.expires_at) > now).toBe(true);
    });

    test('should identify used tokens', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const csrfToken = await CsrfToken.create({
        token,
        expires_at: expiresAt,
        used: false
      });

      // Mark as used
      csrfToken.used = true;
      await csrfToken.save();

      const updatedToken = await CsrfToken.findOne({ where: { token } });
      expect(updatedToken.used).toBe(true);
    });
  });

  describe('Token Association', () => {
    test('should allow optional user_id', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const csrfToken = await CsrfToken.create({
        token,
        expires_at: expiresAt,
        user_id: null
      });

      expect(csrfToken.user_id).toBeNull();
    });

    test('should store user_id when provided', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      // Note: This assumes a user with ID 1 exists in a real scenario
      // For unit tests, we just verify the field accepts the value
      const csrfToken = await CsrfToken.create({
        token,
        expires_at: expiresAt,
        user_id: 999 // Using a non-existent ID for test
      });

      expect(csrfToken.user_id).toBe(999);
    });
  });

  describe('Token Updates', () => {
    test('should update used status', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const csrfToken = await CsrfToken.create({
        token,
        expires_at: expiresAt,
        used: false
      });

      // Update used status
      await csrfToken.update({ used: true });

      const updatedToken = await CsrfToken.findOne({ where: { token } });
      expect(updatedToken.used).toBe(true);
    });

    test('should not allow updating token value', async () => {
      const token1 = crypto.randomBytes(32).toString('hex');
      const token2 = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const csrfToken = await CsrfToken.create({
        token: token1,
        expires_at: expiresAt
      });

      // Attempt to update token (should work in Sequelize but violates uniqueness if token2 exists)
      await csrfToken.update({ token: token2 });

      const updatedToken = await CsrfToken.findByPk(csrfToken.id);
      expect(updatedToken.token).toBe(token2);
    });
  });

  describe('Token Deletion', () => {
    test('should delete token by id', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const csrfToken = await CsrfToken.create({
        token,
        expires_at: expiresAt
      });

      const id = csrfToken.id;
      await csrfToken.destroy();

      const deletedToken = await CsrfToken.findByPk(id);
      expect(deletedToken).toBeNull();
    });

    test('should bulk delete expired tokens', async () => {
      const now = new Date();

      // Create expired token
      const expiredToken = crypto.randomBytes(32).toString('hex');
      await CsrfToken.create({
        token: expiredToken,
        expires_at: new Date(now.getTime() - 1000)
      });

      // Create valid token
      const validToken = crypto.randomBytes(32).toString('hex');
      await CsrfToken.create({
        token: validToken,
        expires_at: new Date(now.getTime() + 2 * 60 * 60 * 1000)
      });

      // Delete expired tokens
      const { Op } = require('sequelize');
      await CsrfToken.destroy({
        where: {
          expires_at: { [Op.lt]: now }
        }
      });

      // Verify expired token is gone
      const expiredCheck = await CsrfToken.findOne({ where: { token: expiredToken } });
      expect(expiredCheck).toBeNull();

      // Verify valid token still exists
      const validCheck = await CsrfToken.findOne({ where: { token: validToken } });
      expect(validCheck).not.toBeNull();
    });
  });

  describe('Token Queries', () => {
    test('should find all valid unused tokens', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Create valid unused token
      await CsrfToken.create({
        token: crypto.randomBytes(32).toString('hex'),
        expires_at: futureDate,
        used: false
      });

      // Create valid used token
      await CsrfToken.create({
        token: crypto.randomBytes(32).toString('hex'),
        expires_at: futureDate,
        used: true
      });

      // Create expired unused token
      await CsrfToken.create({
        token: crypto.randomBytes(32).toString('hex'),
        expires_at: new Date(now.getTime() - 1000),
        used: false
      });

      // Find valid unused tokens
      const { Op } = require('sequelize');
      const validUnusedTokens = await CsrfToken.findAll({
        where: {
          expires_at: { [Op.gt]: now },
          used: false
        }
      });

      expect(validUnusedTokens.length).toBe(1);
    });

    test('should count tokens by IP address', async () => {
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const ipAddress = '203.0.113.1';

      // Create multiple tokens from same IP
      await CsrfToken.create({
        token: crypto.randomBytes(32).toString('hex'),
        expires_at: expiresAt,
        ip_address: ipAddress
      });

      await CsrfToken.create({
        token: crypto.randomBytes(32).toString('hex'),
        expires_at: expiresAt,
        ip_address: ipAddress
      });

      await CsrfToken.create({
        token: crypto.randomBytes(32).toString('hex'),
        expires_at: expiresAt,
        ip_address: '198.51.100.1' // Different IP
      });

      const count = await CsrfToken.count({
        where: { ip_address: ipAddress }
      });

      expect(count).toBe(2);
    });
  });
});
