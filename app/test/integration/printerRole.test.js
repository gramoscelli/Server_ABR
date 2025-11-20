/**
 * Printer Role Integration Tests
 * Tests printer role authentication and access to tirada endpoints
 */

const request = require('supertest');
const app = require('../../app');
const { User, Role } = require('../../models');

describe('Printer Role Integration Tests', () => {
  let printerToken;
  let csrfToken;
  let printerUser;

  beforeAll(async () => {
    // Find the printer_client user
    printerUser = await User.findOne({
      where: { username: 'printer_client' },
      include: [{ model: Role, as: 'role' }]
    });

    // Get CSRF token
    const csrfResponse = await request(app)
      .get('/api/csrf-token')
      .expect(200);

    csrfToken = csrfResponse.body.csrfToken;
  });

  describe('Printer Client Login', () => {
    test('should login printer_client successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({
          username: 'printer_client',
          password: 'printer123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('printer_client');
      expect(response.body.user.role).toBe('printer');

      printerToken = response.body.accessToken;
    });

    test('printer user should have printer role', async () => {
      expect(printerUser).toBeDefined();
      expect(printerUser.role).toBeDefined();
      expect(printerUser.role.name).toBe('printer');
    });

    test('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({
          username: 'printer_client',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Printer Role Access to Tirada Endpoints', () => {
    test('printer can access tirada by range', async () => {
      const response = await request(app)
        .get('/api/tirada/start/1/end/3')
        .set('Authorization', `Bearer ${printerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('printer can access tirada by pagination', async () => {
      const response = await request(app)
        .get('/api/tirada/start/1/frompage/0/topage/1')
        .set('Authorization', `Bearer ${printerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('printer can access tirada by custom IDs', async () => {
      const response = await request(app)
        .get('/api/tirada/custom/1/2/3')
        .set('Authorization', `Bearer ${printerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('printer cannot access without token', async () => {
      const response = await request(app)
        .get('/api/tirada/start/1/end/3')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('Printer Role Restrictions', () => {
    test('printer cannot access user management endpoints', async () => {
      // This would need user management endpoints to test
      // For now, we verify the role permissions in the model tests
      const hasUserAccess = printerUser.role.hasPermission('users', 'read');
      expect(hasUserAccess).toBe(false);
    });

    test('printer cannot access role management endpoints', async () => {
      const hasRoleAccess = printerUser.role.hasPermission('roles', 'read');
      expect(hasRoleAccess).toBe(false);
    });

    test('printer cannot access api key management', async () => {
      const hasApiKeyAccess = printerUser.role.hasPermission('api_keys', 'read');
      expect(hasApiKeyAccess).toBe(false);
    });

    test('printer cannot create, update, or delete tirada', async () => {
      expect(printerUser.role.hasPermission('tirada', 'create')).toBe(false);
      expect(printerUser.role.hasPermission('tirada', 'update')).toBe(false);
      expect(printerUser.role.hasPermission('tirada', 'delete')).toBe(false);
    });

    test('printer can only read and print tirada', async () => {
      expect(printerUser.role.hasPermission('tirada', 'read')).toBe(true);
      expect(printerUser.role.hasPermission('tirada', 'print')).toBe(true);
    });
  });

  describe('Token Refresh for Printer Role', () => {
    let refreshToken;

    beforeAll(async () => {
      // Get new CSRF token
      const csrfResponse = await request(app)
        .get('/api/csrf-token')
        .expect(200);
      csrfToken = csrfResponse.body.csrfToken;

      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({
          username: 'printer_client',
          password: 'printer123'
        })
        .expect(200);

      refreshToken = loginResponse.body.refreshToken;
    });

    test('printer can refresh access token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('X-CSRF-Token', csrfToken)
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // New token should also have printer role
      const newToken = response.body.accessToken;
      const tiradaResponse = await request(app)
        .get('/api/tirada/start/1/end/1')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(Array.isArray(tiradaResponse.body)).toBe(true);
    });
  });

  describe('Printer Role Logout', () => {
    let tempToken, tempRefreshToken;

    beforeAll(async () => {
      // Get new CSRF token
      const csrfResponse = await request(app)
        .get('/api/csrf-token')
        .expect(200);
      csrfToken = csrfResponse.body.csrfToken;

      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({
          username: 'printer_client',
          password: 'printer123'
        })
        .expect(200);

      tempToken = loginResponse.body.accessToken;
      tempRefreshToken = loginResponse.body.refreshToken;
    });

    test('printer can logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tempToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ refreshToken: tempRefreshToken })
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
    });

    test('refresh token should be invalidated after logout', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .set('X-CSRF-Token', csrfToken)
        .send({ refreshToken: tempRefreshToken })
        .expect(403);
    });
  });

  describe('User Permission Methods', () => {
    test('printer user should have permission methods', async () => {
      expect(typeof printerUser.hasPermission).toBe('function');
      expect(typeof printerUser.getResourcePermissions).toBe('function');
      expect(typeof printerUser.getRoleName).toBe('function');
      expect(typeof printerUser.hasRole).toBe('function');
    });

    test('printer user hasPermission should work correctly', async () => {
      expect(await printerUser.hasPermission('tirada', 'read')).toBe(true);
      expect(await printerUser.hasPermission('tirada', 'print')).toBe(true);
      expect(await printerUser.hasPermission('users', 'create')).toBe(false);
    });

    test('printer user getRoleName should return printer', async () => {
      const roleName = await printerUser.getRoleName();
      expect(roleName).toBe('printer');
    });

    test('printer user hasRole should verify role correctly', async () => {
      expect(await printerUser.hasRole('printer')).toBe(true);
      expect(await printerUser.hasRole('admin')).toBe(false);
      expect(await printerUser.hasRole('user')).toBe(false);
    });

    test('printer user getResourcePermissions should return correct permissions', async () => {
      const tiradaPerms = await printerUser.getResourcePermissions('tirada');
      expect(tiradaPerms).toEqual(expect.arrayContaining(['read', 'print']));

      const usersPerms = await printerUser.getResourcePermissions('users');
      expect(usersPerms).toEqual([]);
    });
  });
});
