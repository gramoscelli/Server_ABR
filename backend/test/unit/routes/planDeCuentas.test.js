/**
 * Plan de Cuentas Routes Unit Tests
 * Tests CRUD operations for chart of accounts
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, RefreshToken } = require('../../../models');
const { sequelize } = require('../../../config/database');
const { accountingDb } = require('../../../config/database');
const { PlanDeCuentas, Account, Expense, Income } = require('../../../models/accounting');
const { authenticateToken } = require('../../../middleware/auth');
const planDeCuentasRouter = require('../../../routes/accounting/planDeCuentas');

const app = express();
app.use(express.json());
app.use('/api/accounting/plan-de-cuentas', authenticateToken, planDeCuentasRouter);

describe('Plan de Cuentas Routes', () => {
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
    await Expense.destroy({ where: {}, force: true });
    await Income.destroy({ where: {}, force: true });
    await Account.destroy({ where: {}, force: true });
    await PlanDeCuentas.destroy({ where: {}, force: true });
    await RefreshToken.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    const passwordHash = await bcrypt.hash('TestP@ss99', 10);
    testUser = await User.create({
      username: 'plantest',
      password_hash: passwordHash,
      email: 'plan@test.com',
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

  // ─── GET / ──────────────────────────────────────────────────────────

  describe('GET /api/accounting/plan-de-cuentas', () => {
    test('should return all accounts from chart of accounts', async () => {
      await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });
      await PlanDeCuentas.create({ codigo: 5101, nombre: 'Gastos generales', tipo: 'egreso', grupo: '51' });

      const res = await request(app)
        .get('/api/accounting/plan-de-cuentas')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.count).toBe(2);
    });

    test('should return accounts ordered by codigo ascending', async () => {
      await PlanDeCuentas.create({ codigo: 5101, nombre: 'Gastos generales', tipo: 'egreso', grupo: '51' });
      await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });
      await PlanDeCuentas.create({ codigo: 2101, nombre: 'Proveedores', tipo: 'pasivo', grupo: '21' });

      const res = await request(app)
        .get('/api/accounting/plan-de-cuentas')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].codigo).toBe(1101);
      expect(res.body.data[1].codigo).toBe(2101);
      expect(res.body.data[2].codigo).toBe(5101);
    });

    test('should filter by tipo query param', async () => {
      await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });
      await PlanDeCuentas.create({ codigo: 4101, nombre: 'Cuotas', tipo: 'ingreso', grupo: '41' });
      await PlanDeCuentas.create({ codigo: 5101, nombre: 'Gastos', tipo: 'egreso', grupo: '51' });

      const res = await request(app)
        .get('/api/accounting/plan-de-cuentas?tipo=ingreso')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].nombre).toBe('Cuotas');
      expect(res.body.data[0].tipo).toBe('ingreso');
    });

    test('should return empty array when no accounts match filter', async () => {
      await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });

      const res = await request(app)
        .get('/api/accounting/plan-de-cuentas?tipo=egreso')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.count).toBe(0);
    });
  });

  // ─── GET /:id ───────────────────────────────────────────────────────

  describe('GET /api/accounting/plan-de-cuentas/:id', () => {
    test('should return a single account by ID', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });

      const res = await request(app)
        .get(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.codigo).toBe(1101);
      expect(res.body.data.nombre).toBe('Caja');
    });

    test('should return 404 for non-existent ID', async () => {
      const res = await request(app)
        .get('/api/accounting/plan-de-cuentas/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Cuenta no encontrada');
    });
  });

  // ─── GET /by-codigo/:codigo ─────────────────────────────────────────

  describe('GET /api/accounting/plan-de-cuentas/by-codigo/:codigo', () => {
    test('should return account by codigo', async () => {
      await PlanDeCuentas.create({ codigo: 4201, nombre: 'Donaciones', tipo: 'ingreso', grupo: '42' });

      const res = await request(app)
        .get('/api/accounting/plan-de-cuentas/by-codigo/4201')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.codigo).toBe(4201);
      expect(res.body.data.nombre).toBe('Donaciones');
    });

    test('should return 404 for non-existent codigo', async () => {
      const res = await request(app)
        .get('/api/accounting/plan-de-cuentas/by-codigo/9999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Cuenta no encontrada');
    });
  });

  // ─── POST / ─────────────────────────────────────────────────────────

  describe('POST /api/accounting/plan-de-cuentas', () => {
    test('should create an activo account (codigo starting with 1)', async () => {
      const res = await request(app)
        .post('/api/accounting/plan-de-cuentas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ codigo: 1101, nombre: 'Caja' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.codigo).toBe(1101);
      expect(res.body.data.nombre).toBe('Caja');
      expect(res.body.data.tipo).toBe('activo');
      expect(res.body.data.grupo).toBe('11');
      expect(res.body.data.is_active).toBe(true);
      expect(res.body.message).toBe('Cuenta creada correctamente');
    });

    test('should create a pasivo account (codigo starting with 2)', async () => {
      const res = await request(app)
        .post('/api/accounting/plan-de-cuentas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ codigo: 2101, nombre: 'Proveedores' });

      expect(res.status).toBe(201);
      expect(res.body.data.tipo).toBe('pasivo');
      expect(res.body.data.grupo).toBe('21');
    });

    test('should create an ingreso account (codigo starting with 4)', async () => {
      const res = await request(app)
        .post('/api/accounting/plan-de-cuentas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ codigo: 4101, nombre: 'Cuotas sociales' });

      expect(res.status).toBe(201);
      expect(res.body.data.tipo).toBe('ingreso');
      expect(res.body.data.grupo).toBe('41');
    });

    test('should create an egreso account (codigo starting with 5)', async () => {
      const res = await request(app)
        .post('/api/accounting/plan-de-cuentas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ codigo: 5501, nombre: 'Servicios' });

      expect(res.status).toBe(201);
      expect(res.body.data.tipo).toBe('egreso');
      expect(res.body.data.grupo).toBe('55');
    });

    test('should return 400 when codigo is missing', async () => {
      const res = await request(app)
        .post('/api/accounting/plan-de-cuentas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nombre: 'Sin codigo' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Los campos codigo y nombre son requeridos');
    });

    test('should return 400 when nombre is missing', async () => {
      const res = await request(app)
        .post('/api/accounting/plan-de-cuentas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ codigo: 1101 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Los campos codigo y nombre son requeridos');
    });

    test('should return 400 for invalid codigo prefix (e.g. starts with 3)', async () => {
      const res = await request(app)
        .post('/api/accounting/plan-de-cuentas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ codigo: 3101, nombre: 'Invalido' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Código inválido');
    });

    test('should return 400 for invalid codigo prefix (e.g. starts with 6)', async () => {
      const res = await request(app)
        .post('/api/accounting/plan-de-cuentas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ codigo: 6101, nombre: 'Invalido' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return 409 for duplicate codigo', async () => {
      await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });

      const res = await request(app)
        .post('/api/accounting/plan-de-cuentas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ codigo: 1101, nombre: 'Caja duplicada' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Ya existe una cuenta con el código 1101');
    });
  });

  // ─── PUT /:id ───────────────────────────────────────────────────────

  describe('PUT /api/accounting/plan-de-cuentas/:id', () => {
    test('should update nombre', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });

      const res = await request(app)
        .put(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nombre: 'Caja chica' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nombre).toBe('Caja chica');
      expect(res.body.message).toBe('Cuenta actualizada correctamente');

      // Verify in DB
      const updated = await PlanDeCuentas.findByPk(cuenta.id);
      expect(updated.nombre).toBe('Caja chica');
    });

    test('should deactivate account (set is_active to false)', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11', is_active: true });

      const res = await request(app)
        .put(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_active).toBe(false);

      const updated = await PlanDeCuentas.findByPk(cuenta.id);
      expect(updated.is_active).toBe(false);
    });

    test('should reactivate account (set is_active to true)', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11', is_active: false });

      const res = await request(app)
        .put(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ is_active: true });

      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(true);
    });

    test('should update nombre without affecting is_active', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11', is_active: false });

      const res = await request(app)
        .put(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nombre: 'Caja renombrada' });

      expect(res.status).toBe(200);
      expect(res.body.data.nombre).toBe('Caja renombrada');
      expect(res.body.data.is_active).toBe(false);
    });

    test('should return 404 for non-existent ID', async () => {
      const res = await request(app)
        .put('/api/accounting/plan-de-cuentas/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nombre: 'No existe' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Cuenta no encontrada');
    });

    test('should block deactivation when linked to an active Account', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11', is_active: true });
      await Account.create({
        name: 'Caja Principal',
        type: 'cash',
        plan_cta_id: cuenta.id,
        is_active: true,
      });

      const res = await request(app)
        .put(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No se puede desactivar');
      expect(res.body.message).toContain('Caja Principal');

      // Verify it was NOT deactivated
      const unchanged = await PlanDeCuentas.findByPk(cuenta.id);
      expect(unchanged.is_active).toBe(true);
    });

    test('should allow deactivation when linked Account is inactive', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11', is_active: true });
      await Account.create({
        name: 'Caja Inactiva',
        type: 'cash',
        plan_cta_id: cuenta.id,
        is_active: false,
      });

      const res = await request(app)
        .put(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(false);
    });
  });

  // ─── DELETE /:id ────────────────────────────────────────────────────

  describe('DELETE /api/accounting/plan-de-cuentas/:id', () => {
    test('should delete an account with no associations', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });

      const res = await request(app)
        .delete(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Cuenta eliminada correctamente');

      const deleted = await PlanDeCuentas.findByPk(cuenta.id);
      expect(deleted).toBeNull();
    });

    test('should return 404 for non-existent ID', async () => {
      const res = await request(app)
        .delete('/api/accounting/plan-de-cuentas/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Cuenta no encontrada');
    });

    test('should block deletion when account has expenses', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 5101, nombre: 'Gastos', tipo: 'egreso', grupo: '51' });
      // Need an Account for the expense's account_id FK
      const auxCuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });
      const account = await Account.create({
        name: 'Caja Principal',
        type: 'cash',
        plan_cta_id: auxCuenta.id,
        is_active: true,
      });
      await Expense.create({
        amount: 100.00,
        plan_cta_id: cuenta.id,
        account_id: account.id,
        date: new Date(),
        user_id: testUser.id,
      });

      const res = await request(app)
        .delete(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No se puede eliminar');
      expect(res.body.message).toContain('egreso(s)');
      expect(res.body.details.expenses).toBe(1);
    });

    test('should block deletion when account has incomes', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 4101, nombre: 'Cuotas', tipo: 'ingreso', grupo: '41' });
      const auxCuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });
      const account = await Account.create({
        name: 'Caja Principal',
        type: 'cash',
        plan_cta_id: auxCuenta.id,
        is_active: true,
      });
      await Income.create({
        amount: 500.00,
        plan_cta_id: cuenta.id,
        account_id: account.id,
        date: new Date(),
        user_id: testUser.id,
      });

      const res = await request(app)
        .delete(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No se puede eliminar');
      expect(res.body.message).toContain('ingreso(s)');
      expect(res.body.details.incomes).toBe(1);
    });

    test('should block deletion when account has a linked Account', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });
      await Account.create({
        name: 'Caja Principal',
        type: 'cash',
        plan_cta_id: cuenta.id,
        is_active: true,
      });

      const res = await request(app)
        .delete(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No se puede eliminar');
      expect(res.body.message).toContain('Caja Principal');
      expect(res.body.details.linked_account).toBe('Caja Principal');
    });

    test('should block deletion when account has multiple associations', async () => {
      const cuenta = await PlanDeCuentas.create({ codigo: 5101, nombre: 'Gastos', tipo: 'egreso', grupo: '51' });
      const auxCuenta = await PlanDeCuentas.create({ codigo: 1101, nombre: 'Caja', tipo: 'activo', grupo: '11' });
      const account = await Account.create({
        name: 'Cuenta Banco',
        type: 'bank',
        plan_cta_id: auxCuenta.id,
        is_active: true,
      });
      await Expense.create({
        amount: 50.00,
        plan_cta_id: cuenta.id,
        account_id: account.id,
        date: new Date(),
        user_id: testUser.id,
      });
      await Income.create({
        amount: 200.00,
        plan_cta_id: cuenta.id,
        account_id: account.id,
        date: new Date(),
        user_id: testUser.id,
      });

      const res = await request(app)
        .delete(`/api/accounting/plan-de-cuentas/${cuenta.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No se puede eliminar');
      expect(res.body.details.expenses).toBe(1);
      expect(res.body.details.incomes).toBe(1);
    });
  });
});
