/**
 * Incomes Routes Unit Tests
 * Tests CRUD operations including balance updates
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, RefreshToken } = require('../../../models');
const { sequelize } = require('../../../config/database');
const { accountingDb } = require('../../../config/database');
const { Income, Account, PlanDeCuentas } = require('../../../models/accounting');
const incomesRouter = require('../../../routes/accounting/incomes');

const app = express();
app.use(express.json());
app.use('/api/accounting/incomes', incomesRouter);

describe('Incomes Routes', () => {
  let accessToken;
  let testUser;
  let rootRole;
  let testAccount;
  let testBankAccount;
  let testPlanCta;

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
    await Income.destroy({ where: {}, force: true });
    await Account.destroy({ where: {}, force: true });
    await PlanDeCuentas.destroy({ where: {}, force: true });
    await RefreshToken.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    const passwordHash = await bcrypt.hash('TestP@ss99', 10);
    testUser = await User.create({
      username: 'incometest',
      password_hash: passwordHash,
      email: 'income@test.com',
      role_id: rootRole.id,
      is_active: true,
      email_verified: true,
    });

    accessToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: 'root', is_active: true },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create PlanDeCuentas entries for accounts
    const cashPlanCta = await PlanDeCuentas.create({
      codigo: '1101',
      nombre: 'CAJA',
      tipo: 'activo',
      grupo: '11',
    });

    const bankPlanCta = await PlanDeCuentas.create({
      codigo: '1102',
      nombre: 'BANCO',
      tipo: 'activo',
      grupo: '11',
    });

    testAccount = await Account.create({
      name: 'Caja Principal',
      type: 'cash',
      initial_balance: 100000,
      current_balance: 100000,
      plan_cta_id: cashPlanCta.id,
    });

    testBankAccount = await Account.create({
      name: 'Banco Nacion',
      type: 'bank',
      initial_balance: 50000,
      current_balance: 50000,
      plan_cta_id: bankPlanCta.id,
    });

    testPlanCta = await PlanDeCuentas.create({
      codigo: '4101',
      nombre: 'CUOTAS SOCIALES',
      tipo: 'ingreso',
      grupo: '41',
    });
  });

  // ─── GET /api/accounting/incomes ─────────────────────────────────────

  describe('GET /api/accounting/incomes', () => {
    test('should return all incomes', async () => {
      await Income.create({
        amount: 5000,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-01',
        description: 'Cuota marzo',
        user_id: testUser.id,
      });
      await Income.create({
        amount: 3000,
        account_id: testBankAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-02',
        description: 'Cuota marzo 2',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/incomes')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.count).toBe(2);
      expect(parseFloat(res.body.summary.totalAmount)).toBe(8000);
    });

    test('should filter by date range', async () => {
      await Income.create({
        amount: 1000,
        account_id: testAccount.id,
        date: '2026-01-15',
        description: 'Enero',
        user_id: testUser.id,
      });
      await Income.create({
        amount: 2000,
        account_id: testAccount.id,
        date: '2026-03-15',
        description: 'Marzo',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/incomes')
        .query({ start_date: '2026-03-01', end_date: '2026-03-31' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toBe('Marzo');
    });

    test('should filter by plan_cta_id', async () => {
      const otherPlanCta = await PlanDeCuentas.create({
        codigo: '4102',
        nombre: 'DONACIONES',
        tipo: 'ingreso',
        grupo: '41',
      });

      await Income.create({
        amount: 1000,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-01',
        description: 'Cuota',
        user_id: testUser.id,
      });
      await Income.create({
        amount: 2000,
        account_id: testAccount.id,
        plan_cta_id: otherPlanCta.id,
        date: '2026-03-01',
        description: 'Donacion',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/incomes')
        .query({ plan_cta_id: testPlanCta.id })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toBe('Cuota');
    });

    test('should filter by account_id', async () => {
      await Income.create({
        amount: 1000,
        account_id: testAccount.id,
        date: '2026-03-01',
        description: 'Caja',
        user_id: testUser.id,
      });
      await Income.create({
        amount: 2000,
        account_id: testBankAccount.id,
        date: '2026-03-01',
        description: 'Banco',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/incomes')
        .query({ account_id: testBankAccount.id })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toBe('Banco');
    });

    test('should return empty for no-match filter', async () => {
      await Income.create({
        amount: 1000,
        account_id: testAccount.id,
        date: '2026-03-01',
        description: 'Test',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/incomes')
        .query({ account_id: 99999 })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  // ─── GET /api/accounting/incomes/:id ─────────────────────────────────

  describe('GET /api/accounting/incomes/:id', () => {
    test('should return a single income with planCta and account', async () => {
      const income = await Income.create({
        amount: 5000,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-01',
        description: 'Cuota socio',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get(`/api/accounting/incomes/${income.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(income.id);
      expect(res.body.data.description).toBe('Cuota socio');
      expect(res.body.data.planCta).toBeDefined();
      expect(res.body.data.planCta.codigo).toBe(4101);
      expect(res.body.data.account).toBeDefined();
      expect(res.body.data.account.name).toBe('Caja Principal');
    });

    test('should return 404 for non-existent income', async () => {
      const res = await request(app)
        .get('/api/accounting/incomes/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /api/accounting/incomes ────────────────────────────────────

  describe('POST /api/accounting/incomes', () => {
    test('should create an income and increase account balance', async () => {
      const res = await request(app)
        .post('/api/accounting/incomes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 15000,
          account_id: testAccount.id,
          plan_cta_id: testPlanCta.id,
          date: '2026-03-09',
          description: 'Cuota nueva',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(parseFloat(res.body.data.amount)).toBe(15000);
      expect(res.body.data.description).toBe('Cuota nueva');

      // Verify account balance increased
      const updatedAccount = await Account.findByPk(testAccount.id);
      expect(parseFloat(updatedAccount.current_balance)).toBe(115000);
    });

    test('should return 400 when amount is zero or negative', async () => {
      const res = await request(app)
        .post('/api/accounting/incomes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 0,
          account_id: testAccount.id,
          date: '2026-03-09',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return 400 when account_id is missing', async () => {
      const res = await request(app)
        .post('/api/accounting/incomes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 5000,
          date: '2026-03-09',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .post('/api/accounting/incomes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 5000,
          account_id: 99999,
          date: '2026-03-09',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PUT /api/accounting/incomes/:id ─────────────────────────────────

  describe('PUT /api/accounting/incomes/:id', () => {
    test('should update income description', async () => {
      const income = await Income.create({
        amount: 5000,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-01',
        description: 'Original',
        user_id: testUser.id,
      });

      const res = await request(app)
        .put(`/api/accounting/incomes/${income.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Actualizado' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe('Actualizado');
    });

    test('should update amount and adjust account balance correctly', async () => {
      // Create income via API so balance is updated
      const createRes = await request(app)
        .post('/api/accounting/incomes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 10000,
          account_id: testAccount.id,
          plan_cta_id: testPlanCta.id,
          date: '2026-03-01',
          description: 'Original',
        });

      expect(createRes.status).toBe(201);
      const incomeId = createRes.body.data.id;

      // Balance should now be 100000 + 10000 = 110000
      let account = await Account.findByPk(testAccount.id);
      expect(parseFloat(account.current_balance)).toBe(110000);

      // Update amount from 10000 to 25000
      const res = await request(app)
        .put(`/api/accounting/incomes/${incomeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 25000 });

      expect(res.status).toBe(200);
      expect(parseFloat(res.body.data.amount)).toBe(25000);

      // Balance should be: 110000 - 10000 (revert) + 25000 (apply new) = 125000
      account = await Account.findByPk(testAccount.id);
      expect(parseFloat(account.current_balance)).toBe(125000);
    });

    test('should return 404 for non-existent income', async () => {
      const res = await request(app)
        .put('/api/accounting/incomes/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Test' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /api/accounting/incomes/:id ──────────────────────────────

  describe('DELETE /api/accounting/incomes/:id', () => {
    test('should delete income and revert account balance', async () => {
      // Create income via API so balance is updated
      const createRes = await request(app)
        .post('/api/accounting/incomes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 20000,
          account_id: testBankAccount.id,
          plan_cta_id: testPlanCta.id,
          date: '2026-03-09',
          description: 'A eliminar',
        });

      expect(createRes.status).toBe(201);
      const incomeId = createRes.body.data.id;

      // Balance should now be 50000 + 20000 = 70000
      let account = await Account.findByPk(testBankAccount.id);
      expect(parseFloat(account.current_balance)).toBe(70000);

      const res = await request(app)
        .delete(`/api/accounting/incomes/${incomeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Balance should be reverted to 50000
      account = await Account.findByPk(testBankAccount.id);
      expect(parseFloat(account.current_balance)).toBe(50000);

      // Verify income is deleted
      const deleted = await Income.findByPk(incomeId);
      expect(deleted).toBeNull();
    });

    test('should return 404 for non-existent income', async () => {
      const res = await request(app)
        .delete('/api/accounting/incomes/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
