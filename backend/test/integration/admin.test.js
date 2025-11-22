/**
 * Admin Routes Integration Tests
 */

const request = require('supertest');
const express = require('express');
const { User } = require('../../models');
const { sequelize } = require('../../config/database');
const { generateAccessToken } = require('../../middleware/auth');
const adminRouter = require('../../routes/admin');
const testUsers = require('../fixtures/users');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

describe('Admin Routes', () => {
  let adminToken;
  let userToken;
  let lockedUser;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await User.destroy({ where: {}, force: true });

    // Create admin user
    const admin = await User.create(testUsers.adminUser);
    adminToken = generateAccessToken({
      id: admin.id,
      username: admin.username,
      role: 'admin'
    });

    // Create regular user
    const user = await User.create(testUsers.validUser);
    userToken = generateAccessToken({
      id: user.id,
      username: user.username,
      role: 'user'
    });

    // Create locked user
    lockedUser = await User.create(testUsers.lockedUser);
  });

  describe('GET /api/admin/users', () => {
    test('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);
      expect(response.body.users).toHaveLength(3);
      expect(response.body.users[0]).toHaveProperty('username');
      expect(response.body.users[0]).toHaveProperty('email');
      expect(response.body.users[0]).not.toHaveProperty('password_hash');
    });

    test('should reject request from non-admin user', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/admin/users');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/users/locked', () => {
    test('should get only locked accounts', async () => {
      const response = await request(app)
        .get('/api/admin/users/locked')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].username).toBe(testUsers.lockedUser.username);
    });

    test('should return empty array if no locked accounts', async () => {
      // Unlock the locked user
      await lockedUser.unlock();

      const response = await request(app)
        .get('/api/admin/users/locked')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
      expect(response.body.users).toHaveLength(0);
    });
  });

  describe('POST /api/admin/users/:userId/unlock', () => {
    test('should unlock locked account', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${lockedUser.id}/unlock`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account unlocked successfully');

      // Verify in database
      await lockedUser.reload();
      expect(lockedUser.isLocked()).toBe(false);
      expect(lockedUser.failed_attempts).toBe(0);
    });

    test('should reject invalid user ID', async () => {
      const response = await request(app)
        .post('/api/admin/users/invalid/unlock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid user ID');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/admin/users/99999/unlock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    test('should reject request from non-admin', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${lockedUser.id}/unlock`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/users/:userId/reset-attempts', () => {
    test('should reset failed attempts', async () => {
      const user = await User.create({
        ...testUsers.validUser,
        username: 'testfailed',
        failed_attempts: 3,
        last_failed_attempt: new Date()
      });

      const response = await request(app)
        .patch(`/api/admin/users/${user.id}/reset-attempts`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Failed attempts reset successfully');

      // Verify in database
      await user.reload();
      expect(user.failed_attempts).toBe(0);
      expect(user.last_failed_attempt).toBeNull();
    });

    test('should keep lock if still active', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${lockedUser.id}/reset-attempts`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      await lockedUser.reload();
      expect(lockedUser.failed_attempts).toBe(0);
      // Lock should still be there unless explicitly unlocked
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .patch('/api/admin/users/99999/reset-attempts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});
