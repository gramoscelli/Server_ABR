/**
 * Authentication Routes Integration Tests
 */

const request = require('supertest');
const express = require('express');
const { User, RefreshToken } = require('../../models');
const { sequelize } = require('../../config/database');
const authRouter = require('../../routes/auth');
const { sanitizeBody, registerSchema, loginSchema } = require('../../middleware/sanitize');
const testUsers = require('../fixtures/users');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Authentication Routes', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await RefreshToken.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'newuser@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.userId).toBeDefined();

      // Verify user in database
      const user = await User.findByUsername('newuser');
      expect(user).not.toBeNull();
      expect(user.email).toBe('newuser@example.com');
    });

    test('should reject registration with duplicate username', async () => {
      await User.create(testUsers.validUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: testUsers.validUser.username,
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Username exists');
    });

    test('should reject registration with weak password (less than 8 chars)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'Pass1@a'  // Only 7 characters
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Weak password');
      expect(response.body.message).toBe('Password must be at least 8 characters long');
    });

    test('should reject registration with password without uppercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password12@'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Weak password');
      expect(response.body.message).toBe('Password must contain at least one uppercase letter');
    });

    test('should reject registration with password without numbers', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'Password@'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Weak password');
      expect(response.body.message).toBe('Password must contain at least 2 numbers');
    });

    test('should reject registration with password without special character', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'Password12'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Weak password');
    });

    test('should accept registration with strong password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'MyP@ssw0rd99'  // Strong password: uppercase, lowercase, 2+ numbers, special char
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User created successfully');
    });

    test('should reject registration with short username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid username');
    });

    test('should reject admin role registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'admintest',
          password: 'password123',
          role: 'admin'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create(testUsers.validUser);
    });

    test('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsers.validUser.username,
          password: testUsers.validUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUsers.validUser.username);
      expect(response.body.user.password_hash).toBeUndefined();

      // Verify refresh token in database
      const user = await User.findByUsername(testUsers.validUser.username);
      const tokenCount = await RefreshToken.countForUser(user.id);
      expect(tokenCount).toBe(1);
    });

    test('should reject login with invalid username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsers.validUser.username,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should increment failed attempts on wrong password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsers.validUser.username,
          password: 'wrongpassword'
        });

      const user = await User.findByUsername(testUsers.validUser.username);
      expect(user.failed_attempts).toBe(1);
    });

    test('should lock account after max failed attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            username: testUsers.validUser.username,
            password: 'wrongpassword'
          });
      }

      const user = await User.findByUsername(testUsers.validUser.username);
      expect(user.isLocked()).toBe(true);
      expect(user.failed_attempts).toBe(5);
    });

    test('should reject login for locked account', async () => {
      await User.create(testUsers.lockedUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsers.lockedUser.username,
          password: testUsers.lockedUser.password
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Account locked');
      expect(response.body.locked_until).toBeDefined();
    });

    test('should reject login for inactive account', async () => {
      await User.create(testUsers.inactiveUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsers.inactiveUser.username,
          password: testUsers.inactiveUser.password
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Account disabled');
    });

    test('should reset failed attempts on successful login', async () => {
      const user = await User.findByUsername(testUsers.validUser.username);
      user.failed_attempts = 3;
      await user.save();

      await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsers.validUser.username,
          password: testUsers.validUser.password
        });

      await user.reload();
      expect(user.failed_attempts).toBe(0);
      expect(user.last_login).not.toBeNull();
    });
  });

  describe('POST /api/auth/refresh', () => {
    let validRefreshToken;
    let validUser;

    beforeEach(async () => {
      validUser = await User.create(testUsers.validUser);

      // Login to get a refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsers.validUser.username,
          password: testUsers.validUser.password
        });

      validRefreshToken = loginResponse.body.refreshToken;
    });

    test('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
    });

    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    test('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing token');
    });
  });

  describe('POST /api/auth/change-password', () => {
    let accessToken;
    let testUser;

    beforeEach(async () => {
      // Create test user and login
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'changepassuser',
          password: 'OldP@ss99',
          email: 'changepass@example.com'
        });

      testUser = await User.findByPk(registerResponse.body.userId);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'changepassuser',
          password: 'OldP@ss99'
        });

      accessToken = loginResponse.body.accessToken;
    });

    test('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldP@ss99',
          newPassword: 'NewP@ss99'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password changed successfully');

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'changepassuser',
          password: 'NewP@ss99'
        });

      expect(loginResponse.status).toBe(200);
    });

    test('should reject change-password with weak new password (less than 8 chars)', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldP@ss99',
          newPassword: 'Pass1@a'  // Only 7 characters
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Weak password');
      expect(response.body.message).toBe('Password must be at least 8 characters long');
    });

    test('should reject change-password with new password without uppercase', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldP@ss99',
          newPassword: 'password12@'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Weak password');
      expect(response.body.message).toBe('Password must contain at least one uppercase letter');
    });

    test('should reject change-password with new password without special character', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldP@ss99',
          newPassword: 'Password12'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Weak password');
    });

    test('should accept change-password with strong password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldP@ss99',
          newPassword: 'Str0ng!P@ss99'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password changed successfully');
    });
  });
});
