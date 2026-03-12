/**
 * Cash Reconciliations Routes Unit Tests
 * Tests CRUD operations and balance calculation
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, RefreshToken } = require('../../../models');
const { sequelize } = require('../../../config/database');
const { accountingDb } = require('../../../config/database');
const { CashReconciliation, Account, Expense, Income, Transfer, PlanDeCuentas } = require('../../../models/accounting');
const cashReconciliationsRouter = require('../../../routes/accounting/cashReconciliations');

const app = express();
app.use(express.json());
app.use('/api/accounting/cash-reconciliations', cashReconciliationsRouter);

describe('Cash Reconciliations Routes', () => {
  let accessToken;
  let testUser;
  let rootRole;
  let testAccount;
  let planCta;

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
    await CashReconciliation.destroy({ where: {}, force: true });
    await Transfer.destroy({ where: {}, force: true });
    await Expense.destroy({ where: {}, force: true });
    await Income.destroy({ where: {}, force: true });
    await Account.destroy({ where: {}, force: true });
    await PlanDeCuentas.destroy({ where: {}, force: true });
    await RefreshToken.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    const passwordHash = await bcrypt.hash('TestP@ss99', 10);
    testUser = await User.create({
      username: 'reconctest',
      password_hash: passwordHash,
      email: 'reconc@test.com',
      role_id: rootRole.id,
      is_active: true,
      email_verified: true,
    });

    accessToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: 'root', is_active: true },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    planCta = await PlanDeCuentas.create({
      codigo: 1101,
      nombre: 'Caja General',
      tipo: 'activo',
      grupo: '11',
      is_active: true,
    });

    testAccount = await Account.create({
      name: 'Caja Principal',
      type: 'cash',
      currency: 'ARS',
      initial_balance: 50000,
      current_balance: 50000,
      is_active: true,
      plan_cta_id: planCta.id,
    });
  });

  describe('GET /api/accounting/cash-reconciliations', () => {
    test('should return all reconciliations', async () => {
      await CashReconciliation.create({
        account_id: testAccount.id,
        date: '2026-03-01',
        opening_balance: 50000,
        closing_balance: 52000,
        expected_balance: 52000,
        user_id: testUser.id,
      });
      await CashReconciliation.create({
        account_id: testAccount.id,
        date: '2026-03-02',
        opening_balance: 52000,
        closing_balance: 53000,
        expected_balance: 53500,
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/cash-reconciliations')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].account).toBeDefined();
    });

    test('should filter by account_id', async () => {
      const planCta2 = await PlanDeCuentas.create({
        codigo: 1102,
        nombre: 'Caja Secundaria',
        tipo: 'activo',
        grupo: '11',
        is_active: true,
      });
      const otherAccount = await Account.create({
        name: 'Otra Caja',
        type: 'cash',
        currency: 'ARS',
        initial_balance: 10000,
        current_balance: 10000,
        is_active: true,
        plan_cta_id: planCta2.id,
      });

      await CashReconciliation.create({
        account_id: testAccount.id,
        date: '2026-03-01',
        opening_balance: 50000,
        closing_balance: 52000,
        expected_balance: 52000,
        user_id: testUser.id,
      });
      await CashReconciliation.create({
        account_id: otherAccount.id,
        date: '2026-03-01',
        opening_balance: 10000,
        closing_balance: 11000,
        expected_balance: 11000,
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/cash-reconciliations')
        .query({ account_id: testAccount.id })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].account_id).toBe(testAccount.id);
    });

    test('should filter by date range', async () => {
      await CashReconciliation.create({
        account_id: testAccount.id,
        date: '2026-02-15',
        opening_balance: 50000,
        closing_balance: 51000,
        expected_balance: 51000,
        user_id: testUser.id,
      });
      await CashReconciliation.create({
        account_id: testAccount.id,
        date: '2026-03-05',
        opening_balance: 51000,
        closing_balance: 52000,
        expected_balance: 52000,
        user_id: testUser.id,
      });
      await CashReconciliation.create({
        account_id: testAccount.id,
        date: '2026-04-10',
        opening_balance: 52000,
        closing_balance: 53000,
        expected_balance: 53000,
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/cash-reconciliations')
        .query({ start_date: '2026-03-01', end_date: '2026-03-31' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].date).toBe('2026-03-05');
    });
  });

  describe('GET /api/accounting/cash-reconciliations/date/:date', () => {
    test('should return reconciliation for specific date and account', async () => {
      await CashReconciliation.create({
        account_id: testAccount.id,
        date: '2026-03-05',
        opening_balance: 50000,
        closing_balance: 52000,
        expected_balance: 52000,
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/cash-reconciliations/date/2026-03-05')
        .query({ account_id: testAccount.id })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBe('2026-03-05');
      expect(res.body.data.account).toBeDefined();
    });

    test('should return 400 without account_id', async () => {
      const res = await request(app)
        .get('/api/accounting/cash-reconciliations/date/2026-03-05')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return 404 when not found', async () => {
      const res = await request(app)
        .get('/api/accounting/cash-reconciliations/date/2026-03-05')
        .query({ account_id: testAccount.id })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/accounting/cash-reconciliations', () => {
    test('should create a reconciliation successfully', async () => {
      const res = await request(app)
        .post('/api/accounting/cash-reconciliations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          account_id: testAccount.id,
          date: '2026-03-05',
          opening_balance: 50000,
          closing_balance: 52000,
          expected_balance: 52500,
          notes: 'Arqueo de prueba',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.account_id).toBe(testAccount.id);
      expect(res.body.data.date).toBe('2026-03-05');
      expect(res.body.data.notes).toBe('Arqueo de prueba');
      expect(res.body.data.account).toBeDefined();
    });

    test('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/accounting/cash-reconciliations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          account_id: testAccount.id,
          date: '2026-03-05',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .post('/api/accounting/cash-reconciliations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          account_id: 99999,
          date: '2026-03-05',
          opening_balance: 50000,
          closing_balance: 52000,
          expected_balance: 52000,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('should return 400 for duplicate date and account', async () => {
      await CashReconciliation.create({
        account_id: testAccount.id,
        date: '2026-03-05',
        opening_balance: 50000,
        closing_balance: 52000,
        expected_balance: 52000,
        user_id: testUser.id,
      });

      const res = await request(app)
        .post('/api/accounting/cash-reconciliations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          account_id: testAccount.id,
          date: '2026-03-05',
          opening_balance: 50000,
          closing_balance: 53000,
          expected_balance: 53000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/accounting/cash-reconciliations/:id', () => {
    test('should update closing_balance and notes', async () => {
      const reconciliation = await CashReconciliation.create({
        account_id: testAccount.id,
        date: '2026-03-05',
        opening_balance: 50000,
        closing_balance: 52000,
        expected_balance: 52000,
        user_id: testUser.id,
      });

      const res = await request(app)
        .put(`/api/accounting/cash-reconciliations/${reconciliation.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ closing_balance: 51500, notes: 'Corregido' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(parseFloat(res.body.data.closing_balance)).toBe(51500);
      expect(res.body.data.notes).toBe('Corregido');
      expect(res.body.data.account).toBeDefined();
    });

    test('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .put('/api/accounting/cash-reconciliations/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ closing_balance: 51500 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/accounting/cash-reconciliations/:id', () => {
    test('should delete a reconciliation', async () => {
      const reconciliation = await CashReconciliation.create({
        account_id: testAccount.id,
        date: '2026-03-05',
        opening_balance: 50000,
        closing_balance: 52000,
        expected_balance: 52000,
        user_id: testUser.id,
      });

      const res = await request(app)
        .delete(`/api/accounting/cash-reconciliations/${reconciliation.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await CashReconciliation.findByPk(reconciliation.id);
      expect(deleted).toBeNull();
    });

    test('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .delete('/api/accounting/cash-reconciliations/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/accounting/cash-reconciliations/calculate/:account_id/:date', () => {
    test('should return calculation for account with no prior reconciliation', async () => {
      const res = await request(app)
        .get(`/api/accounting/cash-reconciliations/calculate/${testAccount.id}/2026-03-05`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.opening_balance).toBe('50000.00');
      expect(res.body.data.expected_balance).toBe('50000.00');
      expect(res.body.data.incomes).toBe('0.00');
      expect(res.body.data.expenses).toBe('0.00');
      expect(res.body.data.incoming_transfers).toBe('0.00');
      expect(res.body.data.outgoing_transfers).toBe('0.00');
    });

    test('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .get('/api/accounting/cash-reconciliations/calculate/99999/2026-03-05')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
