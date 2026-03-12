/**
 * Dashboard & Reports Routes Integration Tests
 * Tests dashboard summary, monthly evolution, and financial reports
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, RefreshToken } = require('../../../models');
const { sequelize } = require('../../../config/database');
const { accountingDb } = require('../../../config/database');
const { Account, Expense, Income, Transfer, PlanDeCuentas } = require('../../../models/accounting');
const dashboardRouter = require('../../../routes/accounting/dashboard');
const reportsRouter = require('../../../routes/accounting/reports');

const app = express();
app.use(express.json());
app.use('/api/accounting/dashboard', dashboardRouter);
app.use('/api/accounting/reports', reportsRouter);

describe('Dashboard & Reports Routes', () => {
  let accessToken;
  let testUser;
  let rootRole;
  let cashAccount;
  let bankAccount;
  let planIngreso;
  let planEgreso;

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

    // Create user and JWT
    const passwordHash = await bcrypt.hash('TestP@ss99', 10);
    testUser = await User.create({
      username: 'dashtest',
      password_hash: passwordHash,
      email: 'dash@test.com',
      role_id: rootRole.id,
      is_active: true,
      email_verified: true,
    });

    accessToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: 'root', is_active: true },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create PlanDeCuentas entries
    planIngreso = await PlanDeCuentas.create({
      codigo: 4101,
      nombre: 'Cuotas sociales',
      tipo: 'ingreso',
      grupo: '41',
      is_active: true,
    });

    planEgreso = await PlanDeCuentas.create({
      codigo: 5501,
      nombre: 'Servicios públicos',
      tipo: 'egreso',
      grupo: '55',
      is_active: true,
    });

    // Create 2 accounts (cash + bank with balances)
    const planCash = await PlanDeCuentas.create({
      codigo: 1101,
      nombre: 'Caja general',
      tipo: 'activo',
      grupo: '11',
      is_active: true,
    });

    const planBank = await PlanDeCuentas.create({
      codigo: 1201,
      nombre: 'Banco Nación',
      tipo: 'activo',
      grupo: '12',
      is_active: true,
    });

    cashAccount = await Account.create({
      name: 'Caja Principal',
      type: 'cash',
      current_balance: 50000.00,
      initial_balance: 50000.00,
      is_active: true,
      plan_cta_id: planCash.id,
    });

    bankAccount = await Account.create({
      name: 'Banco Nación CTA',
      type: 'bank',
      current_balance: 150000.00,
      initial_balance: 150000.00,
      bank_name: 'Banco Nación',
      account_number: '123456',
      is_active: true,
      plan_cta_id: planBank.id,
    });

    // Create sample expenses in Jan 2025 and Feb 2025
    await Expense.create({
      amount: 1000.00,
      plan_cta_id: planEgreso.id,
      account_id: cashAccount.id,
      date: '2025-01-15',
      description: 'Factura de luz enero',
      user_id: testUser.id,
    });

    await Expense.create({
      amount: 2000.00,
      plan_cta_id: planEgreso.id,
      account_id: bankAccount.id,
      date: '2025-02-10',
      description: 'Factura de gas febrero',
      user_id: testUser.id,
    });

    // Create sample incomes in Jan 2025 and Feb 2025
    await Income.create({
      amount: 5000.00,
      plan_cta_id: planIngreso.id,
      account_id: cashAccount.id,
      date: '2025-01-20',
      description: 'Cuota socio #100 enero',
      user_id: testUser.id,
    });

    await Income.create({
      amount: 3000.00,
      plan_cta_id: planIngreso.id,
      account_id: bankAccount.id,
      date: '2025-02-15',
      description: 'Cuota socio #101 febrero',
      user_id: testUser.id,
    });
  });

  // ===== DASHBOARD =====

  describe('GET /api/accounting/dashboard', () => {
    test('should return dashboard with account summaries', async () => {
      const res = await request(app)
        .get('/api/accounting/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accounts');
      expect(res.body.data).toHaveProperty('balances');
      expect(res.body.data).toHaveProperty('period');
      expect(res.body.data).toHaveProperty('recent_transactions');

      // Verify account summaries
      expect(res.body.data.accounts.summary.total).toBe(2);
      expect(res.body.data.accounts.summary.cash).toBe(1);
      expect(res.body.data.accounts.summary.bank).toBe(1);
      expect(res.body.data.accounts.list).toHaveLength(2);
    });

    test('should filter by date range (start_date, end_date)', async () => {
      const res = await request(app)
        .get('/api/accounting/dashboard')
        .query({ start_date: '2025-01-01', end_date: '2025-01-31' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const period = res.body.data.period;
      expect(period.start_date).toBe('2025-01-01');
      expect(period.end_date).toBe('2025-01-31');
      // Only Jan data: expense 1000, income 5000
      expect(parseFloat(period.total_expenses)).toBe(1000.00);
      expect(parseFloat(period.total_incomes)).toBe(5000.00);
      expect(parseFloat(period.net_result)).toBe(4000.00);
    });

    test('should return proper balance totals', async () => {
      const res = await request(app)
        .get('/api/accounting/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);

      const balances = res.body.data.balances;
      expect(parseFloat(balances.by_type.cash)).toBe(50000.00);
      expect(parseFloat(balances.by_type.bank)).toBe(150000.00);
      expect(parseFloat(balances.total)).toBe(200000.00);
    });

    test('should return empty data when no transactions', async () => {
      // Remove all transactions
      await Expense.destroy({ where: {}, force: true });
      await Income.destroy({ where: {}, force: true });

      const res = await request(app)
        .get('/api/accounting/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const period = res.body.data.period;
      expect(parseFloat(period.total_expenses)).toBe(0);
      expect(parseFloat(period.total_incomes)).toBe(0);
      expect(parseFloat(period.net_result)).toBe(0);
      expect(period.expenses_by_category).toHaveLength(0);
      expect(period.incomes_by_category).toHaveLength(0);
    });
  });

  describe('GET /api/accounting/dashboard/monthly', () => {
    test('should return monthly evolution data', async () => {
      const res = await request(app)
        .get('/api/accounting/dashboard/monthly')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Each entry should have month, expenses, incomes, net
      res.body.data.forEach(entry => {
        expect(entry).toHaveProperty('month');
        expect(entry).toHaveProperty('expenses');
        expect(entry).toHaveProperty('incomes');
        expect(entry).toHaveProperty('net');
      });
    });

    test('should group correctly by month', async () => {
      const res = await request(app)
        .get('/api/accounting/dashboard/monthly')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);

      const jan = res.body.data.find(m => m.month === '2025-01');
      const feb = res.body.data.find(m => m.month === '2025-02');

      expect(jan).toBeDefined();
      expect(parseFloat(jan.expenses)).toBe(1000.00);
      expect(parseFloat(jan.incomes)).toBe(5000.00);
      expect(parseFloat(jan.net)).toBe(4000.00);

      expect(feb).toBeDefined();
      expect(parseFloat(feb.expenses)).toBe(2000.00);
      expect(parseFloat(feb.incomes)).toBe(3000.00);
      expect(parseFloat(feb.net)).toBe(1000.00);
    });

    test('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/accounting/dashboard/monthly')
        .query({ start_date: '2025-02-01', end_date: '2025-02-28' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].month).toBe('2025-02');
      expect(parseFloat(res.body.data[0].expenses)).toBe(2000.00);
      expect(parseFloat(res.body.data[0].incomes)).toBe(3000.00);
    });
  });

  // ===== REPORTS =====

  describe('GET /api/accounting/reports/estado-resultados', () => {
    test('should return income statement with grouped items', async () => {
      const res = await request(app)
        .get('/api/accounting/reports/estado-resultados')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('period');
      expect(res.body).toHaveProperty('ingresos');
      expect(res.body).toHaveProperty('egresos');
      expect(res.body).toHaveProperty('resultado');

      // Ingresos grouped by plan_cta
      expect(res.body.ingresos.items.length).toBeGreaterThanOrEqual(1);
      const ingresoItem = res.body.ingresos.items.find(i => i.codigo === 4101);
      expect(ingresoItem).toBeDefined();
      expect(ingresoItem.nombre).toBe('Cuotas sociales');
      expect(parseFloat(ingresoItem.total)).toBe(8000.00); // 5000 + 3000

      // Egresos grouped by plan_cta
      expect(res.body.egresos.items.length).toBeGreaterThanOrEqual(1);
      const egresoItem = res.body.egresos.items.find(i => i.codigo === 5501);
      expect(egresoItem).toBeDefined();
      expect(egresoItem.nombre).toBe('Servicios públicos');
      expect(parseFloat(egresoItem.total)).toBe(3000.00); // 1000 + 2000
    });

    test('should calculate correct net result', async () => {
      const res = await request(app)
        .get('/api/accounting/reports/estado-resultados')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);

      const resultado = res.body.resultado;
      expect(parseFloat(resultado.ingresos)).toBe(8000.00);
      expect(parseFloat(resultado.egresos)).toBe(3000.00);
      expect(parseFloat(resultado.neto)).toBe(5000.00);
    });

    test('should handle date filter', async () => {
      const res = await request(app)
        .get('/api/accounting/reports/estado-resultados')
        .query({ start_date: '2025-01-01', end_date: '2025-01-31' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.period.start_date).toBe('2025-01-01');
      expect(res.body.period.end_date).toBe('2025-01-31');

      // Only January: incomes 5000, expenses 1000
      expect(parseFloat(res.body.resultado.ingresos)).toBe(5000.00);
      expect(parseFloat(res.body.resultado.egresos)).toBe(1000.00);
      expect(parseFloat(res.body.resultado.neto)).toBe(4000.00);
    });

    test('should handle no data', async () => {
      await Expense.destroy({ where: {}, force: true });
      await Income.destroy({ where: {}, force: true });

      const res = await request(app)
        .get('/api/accounting/reports/estado-resultados')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.ingresos.items).toHaveLength(0);
      expect(res.body.egresos.items).toHaveLength(0);
      expect(parseFloat(res.body.resultado.neto)).toBe(0);
    });
  });

  describe('GET /api/accounting/reports/balance-general', () => {
    test('should return balance sheet with accounts grouped by type', async () => {
      const res = await request(app)
        .get('/api/accounting/reports/balance-general')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('activo');

      const activo = res.body.data.activo;
      expect(activo).toHaveProperty('caja');
      expect(activo).toHaveProperty('bancos');
      expect(activo).toHaveProperty('otros');
      expect(activo).toHaveProperty('total');

      // Cash account
      expect(activo.caja.items).toHaveLength(1);
      expect(activo.caja.items[0].name).toBe('Caja Principal');
      expect(parseFloat(activo.caja.items[0].balance)).toBe(50000.00);

      // Bank account
      expect(activo.bancos.items).toHaveLength(1);
      expect(activo.bancos.items[0].name).toBe('Banco Nación CTA');
      expect(parseFloat(activo.bancos.items[0].balance)).toBe(150000.00);

      // Other accounts
      expect(activo.otros.items).toHaveLength(0);
    });

    test('should calculate correct totals', async () => {
      const res = await request(app)
        .get('/api/accounting/reports/balance-general')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);

      const activo = res.body.data.activo;
      expect(parseFloat(activo.caja.total)).toBe(50000.00);
      expect(parseFloat(activo.bancos.total)).toBe(150000.00);
      expect(parseFloat(activo.otros.total)).toBe(0);
      expect(parseFloat(activo.total)).toBe(200000.00);
    });
  });
});
