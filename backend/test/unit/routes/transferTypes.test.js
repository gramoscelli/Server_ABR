/**
 * Transfer Types Routes Unit Tests
 * Tests CRUD operations including is_active support
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, RefreshToken } = require('../../../models');
const { sequelize } = require('../../../config/database');
const { accountingDb } = require('../../../config/database');
const { TransferType } = require('../../../models/accounting');
const transferTypesRouter = require('../../../routes/accounting/transferTypes');

const app = express();
app.use(express.json());
app.use('/api/accounting/transfer-types', transferTypesRouter);

describe('Transfer Types Routes', () => {
  let accessToken;
  let testUser;
  let rootRole;

  beforeAll(async () => {
    await sequelize.authenticate();
    await accountingDb.authenticate();
    await sequelize.sync({ force: true });
    await accountingDb.sync({ force: true });

    rootRole = await Role.create({
      name: 'root',
      description: 'Super administrator',
      is_system: true,
    });
  });

  afterAll(async () => {
    await sequelize.close();
    await accountingDb.close();
  });

  beforeEach(async () => {
    await TransferType.destroy({ where: {}, force: true });
    await RefreshToken.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    const passwordHash = await bcrypt.hash('TestP@ss99', 10);
    testUser = await User.create({
      username: 'transfertest',
      password_hash: passwordHash,
      email: 'transfer@test.com',
      role_id: rootRole.id,
      is_active: true,
      email_verified: true,
    });

    accessToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: 'root', is_active: true },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/accounting/transfer-types', () => {
    test('should return all transfer types with is_active field', async () => {
      await TransferType.create({ name: 'Transferencia', is_active: true });
      await TransferType.create({ name: 'Inactivo', is_active: false });

      const res = await request(app)
        .get('/api/accounting/transfer-types')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);

      const active = res.body.data.find(t => t.name === 'Transferencia');
      const inactive = res.body.data.find(t => t.name === 'Inactivo');
      expect(active.is_active).toBe(true);
      expect(inactive.is_active).toBe(false);
    });

    test('should return types ordered by order_index then name', async () => {
      await TransferType.create({ name: 'Extracción', order_index: 3 });
      await TransferType.create({ name: 'Transferencia', order_index: 1 });
      await TransferType.create({ name: 'Depósito', order_index: 2 });

      const res = await request(app)
        .get('/api/accounting/transfer-types')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('Transferencia');
      expect(res.body.data[1].name).toBe('Depósito');
      expect(res.body.data[2].name).toBe('Extracción');
    });
  });

  describe('POST /api/accounting/transfer-types', () => {
    test('should create a transfer type with is_active=true by default', async () => {
      const res = await request(app)
        .post('/api/accounting/transfer-types')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Depósito', description: 'Depósito de efectivo' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Depósito');
      expect(res.body.data.is_active).toBe(true);
      expect(res.body.data.description).toBe('Depósito de efectivo');
    });

    test('should create a transfer type with is_active=false', async () => {
      const res = await request(app)
        .post('/api/accounting/transfer-types')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Inactivo', is_active: false });

      expect(res.status).toBe(201);
      expect(res.body.data.is_active).toBe(false);
    });

    test('should reject creation without name', async () => {
      const res = await request(app)
        .post('/api/accounting/transfer-types')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Sin nombre' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject invalid color format', async () => {
      const res = await request(app)
        .post('/api/accounting/transfer-types')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test', color: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/accounting/transfer-types/:id', () => {
    test('should update is_active to false', async () => {
      const type = await TransferType.create({ name: 'Test', is_active: true });

      const res = await request(app)
        .put(`/api/accounting/transfer-types/${type.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_active).toBe(false);

      // Verify in DB
      const updated = await TransferType.findByPk(type.id);
      expect(updated.is_active).toBe(false);
    });

    test('should update is_active to true', async () => {
      const type = await TransferType.create({ name: 'Test', is_active: false });

      const res = await request(app)
        .put(`/api/accounting/transfer-types/${type.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ is_active: true });

      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(true);
    });

    test('should update name without affecting is_active', async () => {
      const type = await TransferType.create({ name: 'Original', is_active: false });

      const res = await request(app)
        .put(`/api/accounting/transfer-types/${type.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Renombrado' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renombrado');
      expect(res.body.data.is_active).toBe(false);
    });

    test('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .put('/api/accounting/transfer-types/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/accounting/transfer-types/:id', () => {
    test('should delete a transfer type', async () => {
      const type = await TransferType.create({ name: 'A eliminar' });

      const res = await request(app)
        .delete(`/api/accounting/transfer-types/${type.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await TransferType.findByPk(type.id);
      expect(deleted).toBeNull();
    });

    test('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .delete('/api/accounting/transfer-types/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });
});
