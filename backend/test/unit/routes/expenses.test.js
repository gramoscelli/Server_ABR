/**
 * Expenses Routes Integration Tests
 * Tests CRUD operations for expenses including balance updates
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, RefreshToken } = require('../../../models');
const { sequelize } = require('../../../config/database');
const { accountingDb } = require('../../../config/database');
const { Expense, Account, PlanDeCuentas } = require('../../../models/accounting');
const expensesRouter = require('../../../routes/accounting/expenses');

const app = express();
app.use(express.json());
app.use('/api/accounting/expenses', expensesRouter);

describe('Expenses Routes', () => {
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
    await Expense.destroy({ where: {}, force: true });
    await Account.destroy({ where: {}, force: true });
    await PlanDeCuentas.destroy({ where: {}, force: true });
    await RefreshToken.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    const passwordHash = await bcrypt.hash('TestP@ss99', 10);
    testUser = await User.create({
      username: 'expensetest',
      password_hash: passwordHash,
      email: 'expense@test.com',
      role_id: rootRole.id,
      is_active: true,
      email_verified: true,
    });

    accessToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: 'root', is_active: true },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create PlanDeCuentas entries for accounts (required FK)
    const accountPlanCta1 = await PlanDeCuentas.create({
      codigo: 1101,
      nombre: 'CAJA',
      tipo: 'activo',
      grupo: '11',
    });

    const accountPlanCta2 = await PlanDeCuentas.create({
      codigo: 1102,
      nombre: 'BANCO',
      tipo: 'activo',
      grupo: '11',
    });

    // Create test Account (cash) with initial balance
    testAccount = await Account.create({
      name: 'Caja Principal',
      type: 'cash',
      initial_balance: 100000,
      current_balance: 100000,
      plan_cta_id: accountPlanCta1.id,
    });

    // Create second test Account (bank)
    testBankAccount = await Account.create({
      name: 'Banco Nacion',
      type: 'bank',
      initial_balance: 0,
      current_balance: 0,
      plan_cta_id: accountPlanCta2.id,
    });

    // Create test PlanDeCuentas for expenses
    testPlanCta = await PlanDeCuentas.create({
      codigo: 5501,
      nombre: 'GASTOS GENERALES',
      tipo: 'egreso',
      grupo: '55',
    });
  });

  // ──────────────────────────────────────────────
  // GET /api/accounting/expenses
  // ──────────────────────────────────────────────
  describe('GET /api/accounting/expenses', () => {
    test('should return all expenses', async () => {
      await Expense.create({
        amount: 500,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-01',
        description: 'Gasto 1',
        user_id: testUser.id,
      });
      await Expense.create({
        amount: 300,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-02',
        description: 'Gasto 2',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/expenses')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.count).toBe(2);
    });

    test('should filter by date range (start_date, end_date)', async () => {
      await Expense.create({
        amount: 100,
        account_id: testAccount.id,
        date: '2026-01-15',
        description: 'Enero',
        user_id: testUser.id,
      });
      await Expense.create({
        amount: 200,
        account_id: testAccount.id,
        date: '2026-03-15',
        description: 'Marzo',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/expenses')
        .query({ start_date: '2026-03-01', end_date: '2026-03-31' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toBe('Marzo');
    });

    test('should filter by plan_cta_id', async () => {
      await Expense.create({
        amount: 100,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-01',
        description: 'Con categoria',
        user_id: testUser.id,
      });
      await Expense.create({
        amount: 200,
        account_id: testAccount.id,
        plan_cta_id: null,
        date: '2026-03-01',
        description: 'Sin categoria',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/expenses')
        .query({ plan_cta_id: testPlanCta.id })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toBe('Con categoria');
    });

    test('should filter by account_id', async () => {
      await Expense.create({
        amount: 100,
        account_id: testAccount.id,
        date: '2026-03-01',
        description: 'Caja',
        user_id: testUser.id,
      });
      await Expense.create({
        amount: 200,
        account_id: testBankAccount.id,
        date: '2026-03-01',
        description: 'Banco',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/expenses')
        .query({ account_id: testBankAccount.id })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toBe('Banco');
    });

    test('should paginate results (page, limit)', async () => {
      for (let i = 1; i <= 5; i++) {
        await Expense.create({
          amount: i * 100,
          account_id: testAccount.id,
          date: `2026-03-0${i}`,
          description: `Gasto ${i}`,
          user_id: testUser.id,
        });
      }

      const res = await request(app)
        .get('/api/accounting/expenses')
        .query({ page: 2, limit: 2 })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.pages).toBe(3);
    });

    test('should return empty for no-match dates', async () => {
      await Expense.create({
        amount: 100,
        account_id: testAccount.id,
        date: '2026-03-01',
        description: 'Existe',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/expenses')
        .query({ start_date: '2025-01-01', end_date: '2025-01-31' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // GET /api/accounting/expenses/:id
  // ──────────────────────────────────────────────
  describe('GET /api/accounting/expenses/:id', () => {
    test('should return a single expense with relations', async () => {
      const expense = await Expense.create({
        amount: 750,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-05',
        description: 'Gasto detallado',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get(`/api/accounting/expenses/${expense.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(expense.id);
      expect(res.body.data.amount).toBeDefined();
      expect(res.body.data.planCta).toBeDefined();
      expect(res.body.data.planCta.codigo).toBe(5501);
      expect(res.body.data.account).toBeDefined();
      expect(res.body.data.account.name).toBe('Caja Principal');
    });

    test('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .get('/api/accounting/expenses/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // POST /api/accounting/expenses
  // ──────────────────────────────────────────────
  describe('POST /api/accounting/expenses', () => {
    test('should create expense successfully and decrease account balance', async () => {
      const res = await request(app)
        .post('/api/accounting/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 2500,
          plan_cta_id: testPlanCta.id,
          account_id: testAccount.id,
          date: '2026-03-09',
          description: 'Compra de insumos',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(parseFloat(res.body.data.amount)).toBe(2500);

      // Verify account balance decreased
      const updatedAccount = await Account.findByPk(testAccount.id);
      expect(parseFloat(updatedAccount.current_balance)).toBe(100000 - 2500);
    });

    test('should validate amount > 0 (400)', async () => {
      const res = await request(app)
        .post('/api/accounting/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 0,
          account_id: testAccount.id,
          date: '2026-03-09',
          description: 'Invalid',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should validate account_id required (400)', async () => {
      const res = await request(app)
        .post('/api/accounting/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 100,
          date: '2026-03-09',
          description: 'Sin cuenta',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should validate non-existent account (404)', async () => {
      const res = await request(app)
        .post('/api/accounting/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 100,
          account_id: 99999,
          date: '2026-03-09',
          description: 'Cuenta inexistente',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // PUT /api/accounting/expenses/:id
  // ──────────────────────────────────────────────
  describe('PUT /api/accounting/expenses/:id', () => {
    test('should update description', async () => {
      const expense = await Expense.create({
        amount: 1000,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-05',
        description: 'Original',
        user_id: testUser.id,
      });

      const res = await request(app)
        .put(`/api/accounting/expenses/${expense.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Actualizado' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe('Actualizado');
    });

    test('should update amount and verify balance change', async () => {
      // Get current balance before creating expense
      let account = await Account.findByPk(testAccount.id);
      const balanceBefore = parseFloat(account.current_balance);

      // Create expense via API to properly update balance
      const createRes = await request(app)
        .post('/api/accounting/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 1000,
          account_id: testAccount.id,
          plan_cta_id: testPlanCta.id,
          date: '2026-03-05',
          description: 'Original amount',
        });

      expect(createRes.status).toBe(201);
      const expenseId = createRes.body.data.id;

      // Balance should have decreased by 1000
      account = await Account.findByPk(testAccount.id);
      expect(parseFloat(account.current_balance)).toBe(balanceBefore - 1000);

      // Update amount from 1000 to 3000
      const res = await request(app)
        .put(`/api/accounting/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 3000 });

      expect(res.status).toBe(200);
      expect(parseFloat(res.body.data.amount)).toBe(3000);

      // Balance should be balanceBefore - 3000 (old reverted, new applied)
      account = await Account.findByPk(testAccount.id);
      expect(parseFloat(account.current_balance)).toBe(balanceBefore - 3000);
    });

    test('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .put('/api/accounting/expenses/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Test' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /api/accounting/expenses/:id
  // ──────────────────────────────────────────────
  describe('DELETE /api/accounting/expenses/:id', () => {
    test('should delete expense and revert balance', async () => {
      // Create expense via API to properly update balance
      const createRes = await request(app)
        .post('/api/accounting/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 5000,
          account_id: testAccount.id,
          date: '2026-03-09',
          description: 'A eliminar',
        });

      expect(createRes.status).toBe(201);
      const expenseId = createRes.body.data.id;

      // Balance should be 100000 - 5000 = 95000
      let account = await Account.findByPk(testAccount.id);
      expect(parseFloat(account.current_balance)).toBe(95000);

      const res = await request(app)
        .delete(`/api/accounting/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Balance should be reverted to 100000
      account = await Account.findByPk(testAccount.id);
      expect(parseFloat(account.current_balance)).toBe(100000);

      // Expense should be gone
      const deleted = await Expense.findByPk(expenseId);
      expect(deleted).toBeNull();
    });

    test('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .delete('/api/accounting/expenses/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // GET /api/accounting/expenses/stats/by-category
  // ──────────────────────────────────────────────
  describe('GET /api/accounting/expenses/stats/by-category', () => {
    test('should return grouped stats by category', async () => {
      await Expense.create({
        amount: 1000,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-01',
        description: 'Gasto categorizado 1',
        user_id: testUser.id,
      });
      await Expense.create({
        amount: 2000,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-02',
        description: 'Gasto categorizado 2',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/expenses/stats/by-category')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].codigo).toBe(5501);
      expect(res.body.data[0].name).toBe('GASTOS GENERALES');
      expect(parseFloat(res.body.data[0].total)).toBe(3000);
      expect(res.body.data[0].count).toBe(2);
      expect(res.body.uncategorized).toBeDefined();
    });

    test('should handle expenses without plan_cta_id', async () => {
      await Expense.create({
        amount: 500,
        account_id: testAccount.id,
        plan_cta_id: testPlanCta.id,
        date: '2026-03-01',
        description: 'Con categoria',
        user_id: testUser.id,
      });
      await Expense.create({
        amount: 750,
        account_id: testAccount.id,
        plan_cta_id: null,
        date: '2026-03-01',
        description: 'Sin categoria',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/expenses/stats/by-category')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.uncategorized).toBeDefined();
      expect(parseFloat(res.body.uncategorized.total)).toBe(750);
      expect(res.body.uncategorized.count).toBe(1);
    });
  });
});
