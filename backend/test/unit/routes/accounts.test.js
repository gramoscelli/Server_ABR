/**
 * Accounts Routes Unit Tests
 * Tests CRUD operations for financial accounts
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, RefreshToken } = require('../../../models');
const { sequelize } = require('../../../config/database');
const { accountingDb } = require('../../../config/database');
const { Account, Expense, Income, Transfer, PlanDeCuentas } = require('../../../models/accounting');
const accountsRouter = require('../../../routes/accounting/accounts');

const app = express();
app.use(express.json());
app.use('/api/accounting/accounts', accountsRouter);

describe('Accounts Routes', () => {
  let accessToken;
  let testUser;
  let rootRole;
  let planCtaCaja;
  let planCtaBanco;
  let planCtaInvalid;
  let planCtaAjusteIngreso;
  let planCtaAjusteEgreso;

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
    await Transfer.destroy({ where: {}, force: true });
    await Expense.destroy({ where: {}, force: true });
    await Income.destroy({ where: {}, force: true });
    await Account.destroy({ where: {}, force: true });
    await PlanDeCuentas.destroy({ where: {}, force: true });
    await RefreshToken.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    const passwordHash = await bcrypt.hash('TestP@ss99', 10);
    testUser = await User.create({
      username: 'accounttest',
      password_hash: passwordHash,
      email: 'account@test.com',
      role_id: rootRole.id,
      is_active: true,
      email_verified: true,
    });

    accessToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: 'root', is_active: true },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    planCtaCaja = await PlanDeCuentas.create({ codigo: 1101, nombre: 'CAJA', tipo: 'activo', grupo: '11' });
    planCtaBanco = await PlanDeCuentas.create({ codigo: 1201, nombre: 'BANCO NACION', tipo: 'activo', grupo: '12' });
    planCtaInvalid = await PlanDeCuentas.create({ codigo: 5501, nombre: 'GASTOS', tipo: 'egreso', grupo: '55' });
    planCtaAjusteIngreso = await PlanDeCuentas.create({ codigo: 4901, nombre: 'AJUSTE CONTABLE', tipo: 'ingreso', grupo: '49' });
    planCtaAjusteEgreso = await PlanDeCuentas.create({ codigo: 5901, nombre: 'AJUSTE CONTABLE', tipo: 'egreso', grupo: '59' });
  });

  // ─── GET / ──────────────────────────────────────────────────────────

  describe('GET /api/accounting/accounts', () => {
    test('should return all accounts with summary and planCta included', async () => {
      await Account.create({ name: 'Caja Principal', type: 'cash', plan_cta_id: planCtaCaja.id, initial_balance: 1000, current_balance: 1000 });
      await Account.create({ name: 'Banco Nacion', type: 'bank', plan_cta_id: planCtaBanco.id, initial_balance: 5000, current_balance: 5000 });

      const res = await request(app)
        .get('/api/accounting/accounts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.total).toBe(2);
      expect(res.body.summary.totalBalance).toBe('6000.00');
      expect(res.body.summary.byType.cash).toBe(1);
      expect(res.body.summary.byType.bank).toBe(1);
      // Verify planCta is included
      expect(res.body.data[0].planCta).toBeDefined();
      expect(res.body.data[0].planCta.codigo).toBeDefined();
    });

    test('should filter by type', async () => {
      await Account.create({ name: 'Caja Principal', type: 'cash', plan_cta_id: planCtaCaja.id });
      await Account.create({ name: 'Banco Nacion', type: 'bank', plan_cta_id: planCtaBanco.id });

      const res = await request(app)
        .get('/api/accounting/accounts?type=cash')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('cash');
    });

    test('should filter by is_active', async () => {
      await Account.create({ name: 'Caja Activa', type: 'cash', plan_cta_id: planCtaCaja.id, is_active: true });
      await Account.create({ name: 'Banco Inactivo', type: 'bank', plan_cta_id: planCtaBanco.id, is_active: false });

      const res = await request(app)
        .get('/api/accounting/accounts?is_active=true')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Caja Activa');
    });
  });

  // ─── GET /:id ───────────────────────────────────────────────────────

  describe('GET /api/accounting/accounts/:id', () => {
    test('should return account with recentTransactions', async () => {
      const account = await Account.create({ name: 'Caja Principal', type: 'cash', plan_cta_id: planCtaCaja.id, initial_balance: 1000, current_balance: 1000 });

      const res = await request(app)
        .get(`/api/accounting/accounts/${account.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.account).toBeDefined();
      expect(res.body.data.account.name).toBe('Caja Principal');
      expect(res.body.data.account.planCta).toBeDefined();
      expect(res.body.data.recentTransactions).toBeDefined();
      expect(res.body.data.recentTransactions.expenses).toBeDefined();
      expect(res.body.data.recentTransactions.incomes).toBeDefined();
      expect(res.body.data.recentTransactions.outgoingTransfers).toBeDefined();
      expect(res.body.data.recentTransactions.incomingTransfers).toBeDefined();
    });

    test('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .get('/api/accounting/accounts/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Cuenta no encontrada');
    });
  });

  // ─── POST / ─────────────────────────────────────────────────────────

  describe('POST /api/accounting/accounts', () => {
    test('should create account linked to plan_cta grupo 11', async () => {
      const res = await request(app)
        .post('/api/accounting/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Caja Principal',
          type: 'cash',
          account_number: '001',
          bank_name: null,
          currency: 'ARS',
          initial_balance: 1000,
          notes: 'Caja de efectivo',
          plan_cta_id: planCtaCaja.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Cuenta creada exitosamente');
      expect(res.body.data.name).toBe('Caja Principal');
      expect(res.body.data.type).toBe('cash');
      expect(res.body.data.plan_cta_id).toBe(planCtaCaja.id);
      expect(res.body.data.initial_balance).toBeDefined();
      expect(res.body.data.current_balance).toBeDefined();
    });

    test('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/accounting/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ plan_cta_id: planCtaCaja.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('El nombre es requerido');
    });

    test('should return 400 when plan_cta_id is missing', async () => {
      const res = await request(app)
        .post('/api/accounting/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Cuenta sin plan' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('La cuenta contable (plan de cuentas) es requerida');
    });

    test('should return 400 for invalid account type', async () => {
      const res = await request(app)
        .post('/api/accounting/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Cuenta invalida', type: 'invalid_type', plan_cta_id: planCtaCaja.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Tipo inválido');
    });

    test('should return 400 for non-existent plan_cta_id', async () => {
      const res = await request(app)
        .post('/api/accounting/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Cuenta fantasma', plan_cta_id: 99999 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('La cuenta contable seleccionada no existe');
    });

    test('should return 400 when plan_cta_id is not in grupo 11 or 12', async () => {
      const res = await request(app)
        .post('/api/accounting/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Cuenta invalida', plan_cta_id: planCtaInvalid.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('La cuenta contable debe pertenecer al grupo 11 (Caja) o 12 (Bancos)');
    });

    test('should return 400 for duplicate plan_cta_id', async () => {
      await Account.create({ name: 'Caja existente', type: 'cash', plan_cta_id: planCtaCaja.id });

      const res = await request(app)
        .post('/api/accounting/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Caja duplicada', plan_cta_id: planCtaCaja.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Esta cuenta contable ya está vinculada a otra cuenta');
    });
  });

  // ─── PUT /:id ───────────────────────────────────────────────────────

  describe('PUT /api/accounting/accounts/:id', () => {
    test('should update name and notes', async () => {
      const account = await Account.create({ name: 'Caja Original', type: 'cash', plan_cta_id: planCtaCaja.id });

      const res = await request(app)
        .put(`/api/accounting/accounts/${account.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Caja Renombrada', notes: 'Notas actualizadas' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Cuenta actualizada exitosamente');
      expect(res.body.data.name).toBe('Caja Renombrada');
      expect(res.body.data.notes).toBe('Notas actualizadas');
    });

    test('should update plan_cta_id with validation', async () => {
      const account = await Account.create({ name: 'Caja', type: 'cash', plan_cta_id: planCtaCaja.id });

      const res = await request(app)
        .put(`/api/accounting/accounts/${account.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ plan_cta_id: planCtaBanco.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan_cta_id).toBe(planCtaBanco.id);
    });

    test('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .put('/api/accounting/accounts/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'No existe' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Cuenta no encontrada');
    });

    test('should return 400 for invalid type', async () => {
      const account = await Account.create({ name: 'Caja', type: 'cash', plan_cta_id: planCtaCaja.id });

      const res = await request(app)
        .put(`/api/accounting/accounts/${account.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'invalid_type' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Tipo inválido');
    });
  });

  // ─── PUT /:id/balance ──────────────────────────────────────────────

  describe('PUT /api/accounting/accounts/:id/balance', () => {
    test('should create income for positive adjustment', async () => {
      const account = await Account.create({ name: 'Caja', type: 'cash', plan_cta_id: planCtaCaja.id, initial_balance: 1000, current_balance: 1000 });

      const res = await request(app)
        .put(`/api/accounting/accounts/${account.id}/balance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ new_balance: 1500, notes: 'Ajuste positivo' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Balance ajustado exitosamente');
      expect(res.body.data.old_balance).toBe(1000);
      expect(res.body.data.new_balance).toBe(1500);
      expect(res.body.data.difference).toBe(500);
      expect(res.body.data.operation.type).toBe('income');
      expect(res.body.data.operation.id).toBeDefined();

      // Verify an Income record was created
      const incomes = await Income.findAll({ where: { account_id: account.id } });
      expect(incomes).toHaveLength(1);
      expect(parseFloat(incomes[0].amount)).toBe(500);
      expect(incomes[0].plan_cta_id).toBe(planCtaAjusteIngreso.id);
      expect(incomes[0].user_id).toBe(testUser.id);
    });

    test('should create expense for negative adjustment', async () => {
      const account = await Account.create({ name: 'Caja', type: 'cash', plan_cta_id: planCtaCaja.id, initial_balance: 1000, current_balance: 1000 });

      const res = await request(app)
        .put(`/api/accounting/accounts/${account.id}/balance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ new_balance: 700 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.old_balance).toBe(1000);
      expect(res.body.data.new_balance).toBe(700);
      expect(res.body.data.difference).toBe(-300);
      expect(res.body.data.operation.type).toBe('expense');
      expect(res.body.data.operation.id).toBeDefined();

      // Verify an Expense record was created
      const expenses = await Expense.findAll({ where: { account_id: account.id } });
      expect(expenses).toHaveLength(1);
      expect(parseFloat(expenses[0].amount)).toBe(300);
      expect(expenses[0].plan_cta_id).toBe(planCtaAjusteEgreso.id);
      expect(expenses[0].user_id).toBe(testUser.id);
    });

    test('should reject same balance with 400', async () => {
      const account = await Account.create({ name: 'Caja', type: 'cash', plan_cta_id: planCtaCaja.id, initial_balance: 1000, current_balance: 1000 });

      const res = await request(app)
        .put(`/api/accounting/accounts/${account.id}/balance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ new_balance: 1000 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('El nuevo balance es igual al actual');
    });

    test('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .put('/api/accounting/accounts/99999/balance')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ new_balance: 500 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Cuenta no encontrada');
    });
  });

  // ─── DELETE /:id ────────────────────────────────────────────────────

  describe('DELETE /api/accounting/accounts/:id', () => {
    test('should delete account when no transactions exist', async () => {
      const account = await Account.create({ name: 'Caja Vacia', type: 'cash', plan_cta_id: planCtaCaja.id });

      const res = await request(app)
        .delete(`/api/accounting/accounts/${account.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Cuenta eliminada exitosamente');

      const deleted = await Account.findByPk(account.id);
      expect(deleted).toBeNull();
    });

    test('should return 400 when account has expenses', async () => {
      const account = await Account.create({ name: 'Caja con gastos', type: 'cash', plan_cta_id: planCtaCaja.id });
      await Expense.create({
        amount: 100.00,
        plan_cta_id: planCtaInvalid.id,
        account_id: account.id,
        date: new Date(),
        user_id: testUser.id,
      });

      const res = await request(app)
        .delete(`/api/accounting/accounts/${account.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('No se puede eliminar');
      expect(res.body.details.expenses).toBe(1);
    });

    test('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .delete('/api/accounting/accounts/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Cuenta no encontrada');
    });
  });

  // ─── GET /:id/balance-history ──────────────────────────────────────

  describe('GET /api/accounting/accounts/:id/balance-history', () => {
    test('should return history with running balance', async () => {
      const account = await Account.create({ name: 'Caja', type: 'cash', plan_cta_id: planCtaCaja.id, initial_balance: 1000, current_balance: 1200 });

      await Income.create({
        amount: 500,
        plan_cta_id: planCtaAjusteIngreso.id,
        account_id: account.id,
        date: new Date('2026-01-01'),
        description: 'Ingreso test',
        user_id: testUser.id,
      });
      await Expense.create({
        amount: 300,
        plan_cta_id: planCtaAjusteEgreso.id,
        account_id: account.id,
        date: new Date('2026-01-02'),
        description: 'Egreso test',
        user_id: testUser.id,
      });

      const res = await request(app)
        .get(`/api/accounting/accounts/${account.id}/balance-history`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.account).toBeDefined();
      expect(res.body.data.account.id).toBe(account.id);
      expect(res.body.data.account.name).toBe('Caja');
      expect(res.body.data.account.initial_balance).toBeDefined();
      expect(res.body.data.history).toBeDefined();
      expect(res.body.data.history).toHaveLength(2);
      // First entry: income of 500, running balance = 1000 + 500 = 1500
      expect(res.body.data.history[0].type).toBe('income');
      expect(res.body.data.history[0].balance).toBe('1500.00');
      // Second entry: expense of -300, running balance = 1500 - 300 = 1200
      expect(res.body.data.history[1].type).toBe('expense');
      expect(res.body.data.history[1].balance).toBe('1200.00');
    });

    test('should return 404 for non-existent account', async () => {
      const res = await request(app)
        .get('/api/accounting/accounts/99999/balance-history')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Cuenta no encontrada');
    });
  });
});
