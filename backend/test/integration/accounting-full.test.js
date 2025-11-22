/**
 * Comprehensive Accounting Routes Integration Tests
 * Tests ALL endpoints for the accounting module
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../../config/database');
const { accountingDb } = require('../../config/database');
const { User, Role } = require('../../models');
const {
  Account, Expense, Income, Transfer,
  ExpenseCategory, IncomeCategory, TransferType,
  CashReconciliation
} = require('../../models/accounting');

// Import routes
const accountsRouter = require('../../routes/accounting/accounts');
const expensesRouter = require('../../routes/accounting/expenses');
const incomesRouter = require('../../routes/accounting/incomes');
const transfersRouter = require('../../routes/accounting/transfers');
const expenseCategoriesRouter = require('../../routes/accounting/expenseCategories');
const incomeCategoriesRouter = require('../../routes/accounting/incomeCategories');
const transferTypesRouter = require('../../routes/accounting/transferTypes');
const cashReconciliationsRouter = require('../../routes/accounting/cashReconciliations');
const dashboardRouter = require('../../routes/accounting/dashboard');

// Create test app with all routes
const app = express();
app.use(express.json());
app.use('/api/accounting/accounts', accountsRouter);
app.use('/api/accounting/expenses', expensesRouter);
app.use('/api/accounting/incomes', incomesRouter);
app.use('/api/accounting/transfers', transfersRouter);
app.use('/api/accounting/expense-categories', expenseCategoriesRouter);
app.use('/api/accounting/income-categories', incomeCategoriesRouter);
app.use('/api/accounting/transfer-types', transferTypesRouter);
app.use('/api/accounting/cash-reconciliations', cashReconciliationsRouter);
app.use('/api/accounting/dashboard', dashboardRouter);

describe('Comprehensive Accounting Module Tests', () => {
  let accessToken;
  let testUser;
  let rootRole;

  // Test data holders
  let testAccounts = [];
  let testExpenseCategories = [];
  let testIncomeCategories = [];
  let testTransferTypes = [];
  let testExpenses = [];
  let testIncomes = [];
  let testTransfers = [];

  beforeAll(async () => {
    await sequelize.authenticate();
    await accountingDb.authenticate();

    // Sync databases (use alter in test to preserve structure)
    await sequelize.sync({ force: true });
    await accountingDb.sync({ force: true });

    // Create root role
    rootRole = await Role.create({
      name: 'root',
      description: 'Super administrator',
      is_system: true
    });

    // Create test user with root role
    const passwordHash = await bcrypt.hash('TestP@ss99', 10);
    testUser = await User.create({
      username: 'accountingtest',
      password_hash: passwordHash,
      email: 'accounting@test.com',
      role_id: rootRole.id,
      is_active: true,
      email_verified: true
    });

    // Generate JWT token
    accessToken = jwt.sign(
      { userId: testUser.id, username: testUser.username, role: 'root' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await sequelize.close();
    await accountingDb.close();
  });

  // =============================================
  // ACCOUNTS TESTS
  // =============================================
  describe('Accounts API', () => {
    describe('POST /api/accounting/accounts', () => {
      it('should create a cash account', async () => {
        const response = await request(app)
          .post('/api/accounting/accounts')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Caja Principal',
            type: 'cash',
            currency: 'ARS',
            initial_balance: 50000,
            notes: 'Caja principal de la biblioteca'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Caja Principal');
        expect(response.body.data.type).toBe('cash');
        testAccounts.push(response.body.data);
      });

      it('should create a bank account', async () => {
        const response = await request(app)
          .post('/api/accounting/accounts')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Banco Nación',
            type: 'bank',
            account_number: '1234567890',
            bank_name: 'Banco de la Nación Argentina',
            currency: 'ARS',
            initial_balance: 150000
          });

        expect(response.status).toBe(201);
        expect(response.body.data.type).toBe('bank');
        testAccounts.push(response.body.data);
      });

      it('should create another bank account for transfers', async () => {
        const response = await request(app)
          .post('/api/accounting/accounts')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Banco Provincia',
            type: 'bank',
            account_number: '0987654321',
            bank_name: 'Banco de la Provincia de Buenos Aires',
            currency: 'ARS',
            initial_balance: 75000
          });

        expect(response.status).toBe(201);
        testAccounts.push(response.body.data);
      });

      it('should reject invalid account type', async () => {
        const response = await request(app)
          .post('/api/accounting/accounts')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Invalid Account',
            type: 'invalid_type'
          });

        expect(response.status).toBe(400);
      });

      it('should reject account without name', async () => {
        const response = await request(app)
          .post('/api/accounting/accounts')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            type: 'cash'
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/accounting/accounts', () => {
      it('should return all accounts', async () => {
        const response = await request(app)
          .get('/api/accounting/accounts')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(3);
        expect(response.body.summary).toBeDefined();
        expect(response.body.summary.totalBalance).toBeDefined();
      });

      it('should filter by type', async () => {
        const response = await request(app)
          .get('/api/accounting/accounts?type=bank')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.every(a => a.type === 'bank')).toBe(true);
      });

      it('should filter by active status', async () => {
        const response = await request(app)
          .get('/api/accounting/accounts?is_active=true')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.every(a => a.is_active === true)).toBe(true);
      });
    });

    describe('GET /api/accounting/accounts/:id', () => {
      it('should return single account with transactions', async () => {
        const response = await request(app)
          .get(`/api/accounting/accounts/${testAccounts[0].id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.account).toBeDefined();
        expect(response.body.data.recentTransactions).toBeDefined();
      });

      it('should return 404 for non-existent account', async () => {
        const response = await request(app)
          .get('/api/accounting/accounts/99999')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('PUT /api/accounting/accounts/:id', () => {
      it('should update account', async () => {
        const response = await request(app)
          .put(`/api/accounting/accounts/${testAccounts[0].id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Caja Principal Actualizada',
            notes: 'Notas actualizadas'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Caja Principal Actualizada');
      });
    });

    describe('PUT /api/accounting/accounts/:id/balance', () => {
      it('should adjust account balance', async () => {
        const response = await request(app)
          .put(`/api/accounting/accounts/${testAccounts[0].id}/balance`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            new_balance: 55000,
            notes: 'Ajuste por arqueo de caja'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.new_balance).toBe(55000);
        expect(response.body.data.difference).toBeDefined();
      });
    });
  });

  // =============================================
  // EXPENSE CATEGORIES TESTS
  // =============================================
  describe('Expense Categories API', () => {
    describe('POST /api/accounting/expense-categories', () => {
      it('should create parent expense category', async () => {
        const response = await request(app)
          .post('/api/accounting/expense-categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Servicios',
            color: '#3498db',
            description: 'Gastos de servicios'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe('Servicios');
        testExpenseCategories.push(response.body.data);
      });

      it('should create subcategory', async () => {
        const response = await request(app)
          .post('/api/accounting/expense-categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Electricidad',
            parent_id: testExpenseCategories[0].id,
            color: '#f1c40f'
          });

        expect(response.status).toBe(201);
        testExpenseCategories.push(response.body.data);
      });

      it('should create more categories', async () => {
        const categories = [
          { name: 'Mantenimiento', color: '#e74c3c' },
          { name: 'Suministros', color: '#2ecc71' },
          { name: 'Personal', color: '#9b59b6' }
        ];

        for (const cat of categories) {
          const response = await request(app)
            .post('/api/accounting/expense-categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(cat);
          testExpenseCategories.push(response.body.data);
        }
      });
    });

    describe('GET /api/accounting/expense-categories', () => {
      it('should return hierarchical categories', async () => {
        const response = await request(app)
          .get('/api/accounting/expense-categories')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThan(0);
      });
    });
  });

  // =============================================
  // INCOME CATEGORIES TESTS
  // =============================================
  describe('Income Categories API', () => {
    describe('POST /api/accounting/income-categories', () => {
      it('should create income categories', async () => {
        const categories = [
          { name: 'Cuotas Socios', color: '#27ae60' },
          { name: 'Donaciones', color: '#3498db' },
          { name: 'Eventos', color: '#e67e22' },
          { name: 'Subvenciones', color: '#9b59b6' }
        ];

        for (const cat of categories) {
          const response = await request(app)
            .post('/api/accounting/income-categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(cat);
          expect(response.status).toBe(201);
          testIncomeCategories.push(response.body.data);
        }
      });
    });

    describe('GET /api/accounting/income-categories', () => {
      it('should return all income categories', async () => {
        const response = await request(app)
          .get('/api/accounting/income-categories')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThanOrEqual(4);
      });
    });
  });

  // =============================================
  // TRANSFER TYPES TESTS
  // =============================================
  describe('Transfer Types API', () => {
    describe('POST /api/accounting/transfer-types', () => {
      it('should create transfer types', async () => {
        const types = [
          { name: 'Transferencia Bancaria', description: 'Entre cuentas bancarias' },
          { name: 'Depósito', description: 'Depósito de efectivo a banco' },
          { name: 'Extracción', description: 'Extracción de banco a caja' }
        ];

        for (const type of types) {
          const response = await request(app)
            .post('/api/accounting/transfer-types')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(type);
          expect(response.status).toBe(201);
          testTransferTypes.push(response.body.data);
        }
      });
    });

    describe('GET /api/accounting/transfer-types', () => {
      it('should return all transfer types', async () => {
        const response = await request(app)
          .get('/api/accounting/transfer-types')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  // =============================================
  // EXPENSES TESTS
  // =============================================
  describe('Expenses API', () => {
    describe('POST /api/accounting/expenses', () => {
      it('should create expenses', async () => {
        const expenses = [
          {
            amount: 15000,
            category_id: testExpenseCategories[0].id,
            account_id: testAccounts[0].id,
            date: '2025-01-15',
            description: 'Pago factura luz enero'
          },
          {
            amount: 8500,
            category_id: testExpenseCategories[2].id,
            account_id: testAccounts[0].id,
            date: '2025-01-16',
            description: 'Reparación aire acondicionado'
          },
          {
            amount: 25000,
            category_id: testExpenseCategories[3].id,
            account_id: testAccounts[1].id,
            date: '2025-01-17',
            description: 'Compra de libros nuevos'
          }
        ];

        for (const exp of expenses) {
          const response = await request(app)
            .post('/api/accounting/expenses')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(exp);
          expect(response.status).toBe(201);
          testExpenses.push(response.body.data);
        }
      });
    });

    describe('GET /api/accounting/expenses', () => {
      it('should return all expenses with pagination', async () => {
        const response = await request(app)
          .get('/api/accounting/expenses')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThanOrEqual(3);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.summary).toBeDefined();
      });

      it('should filter by date range', async () => {
        const response = await request(app)
          .get('/api/accounting/expenses?start_date=2025-01-15&end_date=2025-01-16')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(2);
      });

      it('should filter by category', async () => {
        const response = await request(app)
          .get(`/api/accounting/expenses?category_id=${testExpenseCategories[0].id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.every(e => e.category_id === testExpenseCategories[0].id)).toBe(true);
      });
    });

    describe('GET /api/accounting/expenses/:id', () => {
      it('should return single expense with relations', async () => {
        const response = await request(app)
          .get(`/api/accounting/expenses/${testExpenses[0].id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.category).toBeDefined();
        expect(response.body.data.account).toBeDefined();
      });
    });

    describe('PUT /api/accounting/expenses/:id', () => {
      it('should update expense', async () => {
        const response = await request(app)
          .put(`/api/accounting/expenses/${testExpenses[0].id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            description: 'Factura luz enero - actualizado',
            amount: 15500
          });

        expect(response.status).toBe(200);
        expect(response.body.data.description).toContain('actualizado');
      });
    });
  });

  // =============================================
  // INCOMES TESTS
  // =============================================
  describe('Incomes API', () => {
    describe('POST /api/accounting/incomes', () => {
      it('should create incomes', async () => {
        const incomes = [
          {
            amount: 50000,
            category_id: testIncomeCategories[0].id,
            account_id: testAccounts[0].id,
            date: '2025-01-15',
            description: 'Cobro cuotas enero'
          },
          {
            amount: 10000,
            category_id: testIncomeCategories[1].id,
            account_id: testAccounts[0].id,
            date: '2025-01-16',
            description: 'Donación anónima'
          },
          {
            amount: 75000,
            category_id: testIncomeCategories[2].id,
            account_id: testAccounts[1].id,
            date: '2025-01-18',
            description: 'Venta entradas evento cultural'
          }
        ];

        for (const inc of incomes) {
          const response = await request(app)
            .post('/api/accounting/incomes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(inc);
          expect(response.status).toBe(201);
          testIncomes.push(response.body.data);
        }
      });
    });

    describe('GET /api/accounting/incomes', () => {
      it('should return all incomes with summary', async () => {
        const response = await request(app)
          .get('/api/accounting/incomes')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThanOrEqual(3);
        expect(response.body.summary.totalAmount).toBeDefined();
      });
    });
  });

  // =============================================
  // TRANSFERS TESTS
  // =============================================
  describe('Transfers API', () => {
    describe('POST /api/accounting/transfers', () => {
      it('should create transfer between accounts', async () => {
        const response = await request(app)
          .post('/api/accounting/transfers')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 20000,
            from_account_id: testAccounts[0].id,
            to_account_id: testAccounts[1].id,
            transfer_type_id: testTransferTypes[1].id,
            date: '2025-01-17',
            description: 'Depósito a cuenta bancaria'
          });

        expect(response.status).toBe(201);
        testTransfers.push(response.body.data);
      });
    });

    describe('GET /api/accounting/transfers', () => {
      it('should return all transfers', async () => {
        const response = await request(app)
          .get('/api/accounting/transfers')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // =============================================
  // CASH RECONCILIATIONS TESTS
  // =============================================
  describe('Cash Reconciliations API', () => {
    describe('POST /api/accounting/cash-reconciliations', () => {
      it('should create cash reconciliation', async () => {
        const response = await request(app)
          .post('/api/accounting/cash-reconciliations')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            account_id: testAccounts[0].id,
            date: '2025-01-20',
            expected_balance: 50000,
            actual_balance: 49800,
            notes: 'Diferencia de $200 por error en vuelto'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.difference).toBeDefined();
      });
    });

    describe('GET /api/accounting/cash-reconciliations', () => {
      it('should return all reconciliations', async () => {
        const response = await request(app)
          .get('/api/accounting/cash-reconciliations')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
      });
    });
  });

  // =============================================
  // DASHBOARD TESTS
  // =============================================
  describe('Dashboard API', () => {
    describe('GET /api/accounting/dashboard', () => {
      it('should return dashboard summary', async () => {
        const response = await request(app)
          .get('/api/accounting/dashboard')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/accounting/dashboard/summary', () => {
      it('should return period summary', async () => {
        const response = await request(app)
          .get('/api/accounting/dashboard/summary?start_date=2025-01-01&end_date=2025-01-31')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
      });
    });
  });

  // =============================================
  // DELETE TESTS (run last)
  // =============================================
  describe('Delete Operations', () => {
    describe('DELETE /api/accounting/expenses/:id', () => {
      it('should delete expense', async () => {
        // Create an expense to delete
        const createResponse = await request(app)
          .post('/api/accounting/expenses')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 100,
            category_id: testExpenseCategories[0].id,
            account_id: testAccounts[0].id,
            date: '2025-01-20',
            description: 'To be deleted'
          });

        const response = await request(app)
          .delete(`/api/accounting/expenses/${createResponse.body.data.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
      });
    });

    describe('DELETE /api/accounting/incomes/:id', () => {
      it('should delete income', async () => {
        const createResponse = await request(app)
          .post('/api/accounting/incomes')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 100,
            category_id: testIncomeCategories[0].id,
            account_id: testAccounts[0].id,
            date: '2025-01-20',
            description: 'To be deleted'
          });

        const response = await request(app)
          .delete(`/api/accounting/incomes/${createResponse.body.data.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
      });
    });
  });
});
