/**
 * Transfers Routes Integration Tests
 * Tests CRUD operations and balance updates for transfers between accounts
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, RefreshToken } = require('../../../models');
const { sequelize } = require('../../../config/database');
const { accountingDb } = require('../../../config/database');
const { Transfer, TransferType, Account, PlanDeCuentas } = require('../../../models/accounting');
const transfersRouter = require('../../../routes/accounting/transfers');

const app = express();
app.use(express.json());
app.use('/api/accounting/transfers', transfersRouter);

describe('Transfers Routes', () => {
  let accessToken;
  let testUser;
  let rootRole;
  let accountA;
  let accountB;
  let transferType;

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
    await TransferType.destroy({ where: {}, force: true });
    await Account.destroy({ where: {}, force: true });
    await PlanDeCuentas.destroy({ where: {}, force: true });
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

    const planCtaA = await PlanDeCuentas.create({
      codigo: 1101,
      nombre: 'Caja',
      tipo: 'activo',
      grupo: '11',
    });

    const planCtaB = await PlanDeCuentas.create({
      codigo: 1102,
      nombre: 'Banco',
      tipo: 'activo',
      grupo: '11',
    });

    accountA = await Account.create({
      name: 'Caja Principal',
      type: 'cash',
      current_balance: 100000,
      initial_balance: 100000,
      plan_cta_id: planCtaA.id,
    });

    accountB = await Account.create({
      name: 'Banco Nación',
      type: 'bank',
      current_balance: 50000,
      initial_balance: 50000,
      plan_cta_id: planCtaB.id,
    });

    transferType = await TransferType.create({ name: 'Depósito' });
  });

  describe('GET /api/accounting/transfers', () => {
    test('should return all transfers with associations', async () => {
      await Transfer.create({
        amount: 5000,
        from_account_id: accountA.id,
        to_account_id: accountB.id,
        transfer_type_id: transferType.id,
        date: new Date(),
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/transfers')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.summary).toBeDefined();

      const transfer = res.body.data[0];
      expect(transfer.fromAccount).toBeDefined();
      expect(transfer.fromAccount.name).toBe('Caja Principal');
      expect(transfer.toAccount).toBeDefined();
      expect(transfer.toAccount.name).toBe('Banco Nación');
      expect(transfer.transferType).toBeDefined();
      expect(transfer.transferType.name).toBe('Depósito');
    });

    test('should filter by date range', async () => {
      await Transfer.create({
        amount: 1000,
        from_account_id: accountA.id,
        to_account_id: accountB.id,
        date: new Date('2025-06-15'),
        user_id: testUser.id,
      });
      await Transfer.create({
        amount: 2000,
        from_account_id: accountA.id,
        to_account_id: accountB.id,
        date: new Date('2025-08-15'),
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/transfers')
        .query({ start_date: '2025-06-01', end_date: '2025-06-30' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(parseFloat(res.body.data[0].amount)).toBe(1000);
    });

    test('should filter by account_id matching from_account_id or to_account_id', async () => {
      const planCtaC = await PlanDeCuentas.create({
        codigo: 1103,
        nombre: 'Otra Cuenta',
        tipo: 'activo',
        grupo: '11',
      });

      const accountC = await Account.create({
        name: 'Cuenta Extra',
        type: 'other',
        current_balance: 10000,
        plan_cta_id: planCtaC.id,
      });

      // Transfer from A to B
      await Transfer.create({
        amount: 1000,
        from_account_id: accountA.id,
        to_account_id: accountB.id,
        date: new Date(),
        user_id: testUser.id,
      });

      // Transfer from C to A
      await Transfer.create({
        amount: 2000,
        from_account_id: accountC.id,
        to_account_id: accountA.id,
        date: new Date(),
        user_id: testUser.id,
      });

      // Transfer from B to C (should not appear when filtering by A)
      await Transfer.create({
        amount: 3000,
        from_account_id: accountB.id,
        to_account_id: accountC.id,
        date: new Date(),
        user_id: testUser.id,
      });

      const res = await request(app)
        .get('/api/accounting/transfers')
        .query({ account_id: accountA.id })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    test('should paginate results', async () => {
      for (let i = 0; i < 5; i++) {
        await Transfer.create({
          amount: 1000 + i,
          from_account_id: accountA.id,
          to_account_id: accountB.id,
          date: new Date(),
          user_id: testUser.id,
        });
      }

      const res = await request(app)
        .get('/api/accounting/transfers')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.pages).toBe(3);
    });

    test('should return empty for no matching transfers', async () => {
      const res = await request(app)
        .get('/api/accounting/transfers')
        .query({ start_date: '2020-01-01', end_date: '2020-01-31' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  describe('POST /api/accounting/transfers', () => {
    test('should create a transfer and update both balances', async () => {
      const res = await request(app)
        .post('/api/accounting/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 15000,
          from_account_id: accountA.id,
          to_account_id: accountB.id,
          transfer_type_id: transferType.id,
          date: '2025-07-01',
          description: 'Depósito mensual',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(parseFloat(res.body.data.amount)).toBe(15000);
      expect(res.body.data.fromAccount).toBeDefined();
      expect(res.body.data.toAccount).toBeDefined();

      // Verify balances changed
      const updatedA = await Account.findByPk(accountA.id);
      const updatedB = await Account.findByPk(accountB.id);
      expect(parseFloat(updatedA.current_balance)).toBe(100000 - 15000);
      expect(parseFloat(updatedB.current_balance)).toBe(50000 + 15000);
    });

    test('should return 400 when amount is zero or negative', async () => {
      const res = await request(app)
        .post('/api/accounting/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 0,
          from_account_id: accountA.id,
          to_account_id: accountB.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return 400 when from or to account is missing', async () => {
      const res = await request(app)
        .post('/api/accounting/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 1000,
          from_account_id: accountA.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return 400 when from and to accounts are the same', async () => {
      const res = await request(app)
        .post('/api/accounting/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 1000,
          from_account_id: accountA.id,
          to_account_id: accountA.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return 404 for non-existent from account', async () => {
      const res = await request(app)
        .post('/api/accounting/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 1000,
          from_account_id: 99999,
          to_account_id: accountB.id,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('should return 404 for non-existent to account', async () => {
      const res = await request(app)
        .post('/api/accounting/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 1000,
          from_account_id: accountA.id,
          to_account_id: 99999,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/accounting/transfers/:id', () => {
    test('should delete a transfer and revert both balances', async () => {
      // First create a transfer via API to update balances
      const createRes = await request(app)
        .post('/api/accounting/transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 20000,
          from_account_id: accountA.id,
          to_account_id: accountB.id,
          transfer_type_id: transferType.id,
          date: '2025-07-01',
        });

      expect(createRes.status).toBe(201);
      const transferId = createRes.body.data.id;

      // Verify balances after creation
      let updatedA = await Account.findByPk(accountA.id);
      let updatedB = await Account.findByPk(accountB.id);
      expect(parseFloat(updatedA.current_balance)).toBe(80000);
      expect(parseFloat(updatedB.current_balance)).toBe(70000);

      // Delete the transfer
      const res = await request(app)
        .delete(`/api/accounting/transfers/${transferId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify balances reverted
      updatedA = await Account.findByPk(accountA.id);
      updatedB = await Account.findByPk(accountB.id);
      expect(parseFloat(updatedA.current_balance)).toBe(100000);
      expect(parseFloat(updatedB.current_balance)).toBe(50000);

      // Verify transfer is gone
      const deleted = await Transfer.findByPk(transferId);
      expect(deleted).toBeNull();
    });

    test('should return 404 for non-existent transfer', async () => {
      const res = await request(app)
        .delete('/api/accounting/transfers/99999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
