/**
 * Accounting Routes Integration Tests
 * Tests for expenses, incomes, and transfers endpoints
 */

const request = require('supertest');
const express = require('express');
const { User, RefreshToken } = require('../../models');
const { sequelize } = require('../../config/database');
const { accountingDb } = require('../../config/database');
const { Expense, Income, Transfer, Account, ExpenseCategory, IncomeCategory, TransferType } = require('../../models/accounting');
const expensesRouter = require('../../routes/accounting/expenses');
const incomesRouter = require('../../routes/accounting/incomes');
const transfersRouter = require('../../routes/accounting/transfers');
const authRouter = require('../../routes/auth');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/accounting/expenses', expensesRouter);
app.use('/api/accounting/incomes', incomesRouter);
app.use('/api/accounting/transfers', transfersRouter);

describe('Accounting Routes - Date Filtering', () => {
  let accessToken;
  let testAccount;
  let testExpenseCategory;
  let testIncomeCategory;
  let testTransferType;
  let testAccount2;

  beforeAll(async () => {
    await sequelize.authenticate();
    await accountingDb.authenticate();

    // Sync databases
    await sequelize.sync({ force: true });
    await accountingDb.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
    await accountingDb.close();
  });

  beforeEach(async () => {
    // Clean up
    await Expense.destroy({ where: {}, force: true });
    await Income.destroy({ where: {}, force: true });
    await Transfer.destroy({ where: {}, force: true });
    await Account.destroy({ where: {}, force: true });
    await ExpenseCategory.destroy({ where: {}, force: true });
    await IncomeCategory.destroy({ where: {}, force: true });
    await TransferType.destroy({ where: {}, force: true });
    await RefreshToken.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test user with root role (required for accounting endpoints)
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'accountingtest',
        password: 'TestP@ss99',
        email: 'accounting@test.com'
      });

    // Update user role to root for testing
    const user = await User.findByPk(registerResponse.body.userId);
    user.role = 'root';
    await user.save();

    // Login to get access token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'accountingtest',
        password: 'TestP@ss99'
      });

    accessToken = loginResponse.body.accessToken;

    // Create test account
    testAccount = await Account.create({
      name: 'Test Cash Account',
      type: 'cash',
      currency: 'ARS',
      initial_balance: 100000,
      current_balance: 100000,
      is_active: true
    });

    testAccount2 = await Account.create({
      name: 'Test Bank Account',
      type: 'bank',
      currency: 'ARS',
      initial_balance: 50000,
      current_balance: 50000,
      is_active: true
    });

    // Create test expense category
    testExpenseCategory = await ExpenseCategory.create({
      name: 'Test Category',
      color: '#FF0000'
    });

    // Create test income category
    testIncomeCategory = await IncomeCategory.create({
      name: 'Test Income Category',
      color: '#00FF00'
    });

    // Create test transfer type
    testTransferType = await TransferType.create({
      name: 'Test Transfer Type'
    });
  });

  describe('GET /api/accounting/expenses - Date Filtering', () => {
    beforeEach(async () => {
      const user = await User.findOne({ where: { username: 'accountingtest' } });

      // Create expenses with different dates
      await Expense.create({
        amount: 1000,
        category_id: testExpenseCategory.id,
        account_id: testAccount.id,
        date: '2025-01-15',
        description: 'Expense on Jan 15',
        user_id: user.id
      });

      await Expense.create({
        amount: 2000,
        category_id: testExpenseCategory.id,
        account_id: testAccount.id,
        date: '2025-01-16',
        description: 'Expense on Jan 16',
        user_id: user.id
      });

      await Expense.create({
        amount: 3000,
        category_id: testExpenseCategory.id,
        account_id: testAccount.id,
        date: '2025-01-17',
        description: 'Expense on Jan 17',
        user_id: user.id
      });
    });

    test('should return all expenses when no date filter', async () => {
      const response = await request(app)
        .get('/api/accounting/expenses')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });

    test('should filter expenses by single day (start_date = end_date)', async () => {
      const response = await request(app)
        .get('/api/accounting/expenses?start_date=2025-01-16&end_date=2025-01-16')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].description).toBe('Expense on Jan 16');
      expect(response.body.data[0].amount).toBe('2000.00');
    });

    test('should filter expenses by date range', async () => {
      const response = await request(app)
        .get('/api/accounting/expenses?start_date=2025-01-15&end_date=2025-01-16')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should return empty array when no expenses match date', async () => {
      const response = await request(app)
        .get('/api/accounting/expenses?start_date=2025-01-20&end_date=2025-01-20')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    test('should include category in response with correct alias', async () => {
      const response = await request(app)
        .get('/api/accounting/expenses?start_date=2025-01-16&end_date=2025-01-16')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].category).toBeDefined();
      expect(response.body.data[0].category.name).toBe('Test Category');
    });

    test('should include account in response', async () => {
      const response = await request(app)
        .get('/api/accounting/expenses?start_date=2025-01-16&end_date=2025-01-16')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].account).toBeDefined();
      expect(response.body.data[0].account.name).toBe('Test Cash Account');
    });
  });

  describe('GET /api/accounting/incomes - Date Filtering', () => {
    beforeEach(async () => {
      const user = await User.findOne({ where: { username: 'accountingtest' } });

      // Create incomes with different dates
      await Income.create({
        amount: 5000,
        category_id: testIncomeCategory.id,
        account_id: testAccount.id,
        date: '2025-01-15',
        description: 'Income on Jan 15',
        user_id: user.id
      });

      await Income.create({
        amount: 6000,
        category_id: testIncomeCategory.id,
        account_id: testAccount.id,
        date: '2025-01-16',
        description: 'Income on Jan 16',
        user_id: user.id
      });
    });

    test('should filter incomes by single day', async () => {
      const response = await request(app)
        .get('/api/accounting/incomes?start_date=2025-01-16&end_date=2025-01-16')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].description).toBe('Income on Jan 16');
    });
  });

  describe('GET /api/accounting/transfers - Date Filtering', () => {
    beforeEach(async () => {
      const user = await User.findOne({ where: { username: 'accountingtest' } });

      // Create transfers with different dates
      await Transfer.create({
        amount: 10000,
        from_account_id: testAccount.id,
        to_account_id: testAccount2.id,
        transfer_type_id: testTransferType.id,
        date: '2025-01-15',
        description: 'Transfer on Jan 15',
        user_id: user.id
      });

      await Transfer.create({
        amount: 15000,
        from_account_id: testAccount.id,
        to_account_id: testAccount2.id,
        transfer_type_id: testTransferType.id,
        date: '2025-01-16',
        description: 'Transfer on Jan 16',
        user_id: user.id
      });
    });

    test('should filter transfers by single day', async () => {
      const response = await request(app)
        .get('/api/accounting/transfers?start_date=2025-01-16&end_date=2025-01-16')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].description).toBe('Transfer on Jan 16');
    });
  });

  describe('Response Structure Verification', () => {
    test('expenses endpoint should return data array (not expenses)', async () => {
      const response = await request(app)
        .get('/api/accounting/expenses')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      // Verify that response uses 'data' key, not 'expenses'
      expect(response.body.data).toBeDefined();
      expect(response.body.expenses).toBeUndefined();
    });

    test('incomes endpoint should return data array (not incomes)', async () => {
      const response = await request(app)
        .get('/api/accounting/incomes')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      // Verify that response uses 'data' key, not 'incomes'
      expect(response.body.data).toBeDefined();
      expect(response.body.incomes).toBeUndefined();
    });

    test('transfers endpoint should return data array (not transfers)', async () => {
      const response = await request(app)
        .get('/api/accounting/transfers')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      // Verify that response uses 'data' key, not 'transfers'
      expect(response.body.data).toBeDefined();
      expect(response.body.transfers).toBeUndefined();
    });
  });
});
