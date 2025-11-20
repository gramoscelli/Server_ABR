#!/usr/bin/env node

/**
 * Test script for Accounting API endpoints
 * This script creates a test user, authenticates, and tests all accounting endpoints
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message = '') {
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}${message ? ': ' + message : ''}`);

  results.tests.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

async function runTests() {
  console.log('\n=== ACCOUNTING API TEST SUITE ===\n');

  let csrfToken = null;
  let accessToken = null;
  let testAccountId = null;
  let testExpenseCategoryId = null;
  let testIncomeCategoryId = null;
  let testTransferTypeId = null;
  let testExpenseId = null;
  let testIncomeId = null;
  let testTransferId = null;

  try {
    // Step 1: Get CSRF Token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await makeRequest('GET', '/api/csrf-token');
    if (csrfResponse.status === 200 && csrfResponse.body.csrfToken) {
      csrfToken = csrfResponse.body.csrfToken;
      logTest('Get CSRF token', true);
    } else {
      logTest('Get CSRF token', false, `Status: ${csrfResponse.status}`);
      return;
    }

    // Step 2: Create test user with root role
    console.log('\n2. Creating test user...');
    const testUser = {
      username: 'test_accounting_' + Date.now(),
      email: `test_accounting_${Date.now()}@test.com`,
      password: 'TestPassword123!',
      role: 'root',
      csrfToken: csrfToken
    };

    const registerResponse = await makeRequest('POST', '/api/auth/register', testUser);
    if (registerResponse.status === 201 || registerResponse.status === 200) {
      logTest('Create test user', true);
    } else {
      logTest('Create test user', false, `Status: ${registerResponse.status}`);
      console.log('Response:', registerResponse.body);
    }

    // Step 3: Login
    console.log('\n3. Logging in...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      username: testUser.username,
      password: testUser.password,
      csrfToken: csrfToken
    });

    if (loginResponse.status === 200 && loginResponse.body.accessToken) {
      accessToken = loginResponse.body.accessToken;
      logTest('Login', true);
    } else {
      logTest('Login', false, `Status: ${loginResponse.status}`);
      console.log('Response:', loginResponse.body);
      return;
    }

    // Step 4: Test Account endpoints
    console.log('\n4. Testing Account endpoints...');

    // Create account
    const accountData = {
      name: 'Test Account',
      type: 'cash',
      currency: 'ARS',
      initial_balance: 1000
    };
    const createAccountRes = await makeRequest('POST', '/api/accounting/accounts', accountData, accessToken);
    if (createAccountRes.status === 201 && createAccountRes.body.data) {
      testAccountId = createAccountRes.body.data.id;
      logTest('Create account', true, `ID: ${testAccountId}`);
    } else {
      logTest('Create account', false, `Status: ${createAccountRes.status}`);
      console.log('Response:', createAccountRes.body);
    }

    // Get accounts
    const getAccountsRes = await makeRequest('GET', '/api/accounting/accounts', null, accessToken);
    if (getAccountsRes.status === 200 && getAccountsRes.body.data) {
      logTest('Get accounts', true, `Count: ${getAccountsRes.body.data.length}`);
    } else {
      logTest('Get accounts', false, `Status: ${getAccountsRes.status}`);
    }

    // Get single account
    if (testAccountId) {
      const getAccountRes = await makeRequest('GET', `/api/accounting/accounts/${testAccountId}`, null, accessToken);
      if (getAccountRes.status === 200 && getAccountRes.body.data) {
        logTest('Get account by ID', true);
      } else {
        logTest('Get account by ID', false, `Status: ${getAccountRes.status}`);
      }
    }

    // Step 5: Test Expense Category endpoints
    console.log('\n5. Testing Expense Category endpoints...');

    // Get expense categories
    const getExpCatRes = await makeRequest('GET', '/api/accounting/expense-categories', null, accessToken);
    if (getExpCatRes.status === 200 && getExpCatRes.body.data) {
      logTest('Get expense categories', true, `Count: ${getExpCatRes.body.data.length}`);
      if (getExpCatRes.body.data.length > 0) {
        testExpenseCategoryId = getExpCatRes.body.data[0].id;
      }
    } else {
      logTest('Get expense categories', false, `Status: ${getExpCatRes.status}`);
    }

    // Step 6: Test Income Category endpoints
    console.log('\n6. Testing Income Category endpoints...');

    // Get income categories
    const getIncCatRes = await makeRequest('GET', '/api/accounting/income-categories', null, accessToken);
    if (getIncCatRes.status === 200 && getIncCatRes.body.data) {
      logTest('Get income categories', true, `Count: ${getIncCatRes.body.data.length}`);
      if (getIncCatRes.body.data.length > 0) {
        testIncomeCategoryId = getIncCatRes.body.data[0].id;
      }
    } else {
      logTest('Get income categories', false, `Status: ${getIncCatRes.status}`);
    }

    // Step 7: Test Transfer Type endpoints
    console.log('\n7. Testing Transfer Type endpoints...');

    // Get transfer types
    const getTransferTypesRes = await makeRequest('GET', '/api/accounting/transfer-types', null, accessToken);
    if (getTransferTypesRes.status === 200 && getTransferTypesRes.body.data) {
      logTest('Get transfer types', true, `Count: ${getTransferTypesRes.body.data.length}`);
      if (getTransferTypesRes.body.data.length > 0) {
        testTransferTypeId = getTransferTypesRes.body.data[0].id;
      }
    } else {
      logTest('Get transfer types', false, `Status: ${getTransferTypesRes.status}`);
    }

    // Step 8: Test Expense endpoints
    console.log('\n8. Testing Expense endpoints...');

    if (testAccountId) {
      // Create expense
      const expenseData = {
        amount: 100,
        account_id: testAccountId,
        category_id: testExpenseCategoryId,
        date: new Date().toISOString().split('T')[0],
        description: 'Test expense'
      };
      const createExpenseRes = await makeRequest('POST', '/api/accounting/expenses', expenseData, accessToken);
      if (createExpenseRes.status === 201 && createExpenseRes.body.data) {
        testExpenseId = createExpenseRes.body.data.id;
        logTest('Create expense', true, `ID: ${testExpenseId}`);
      } else {
        logTest('Create expense', false, `Status: ${createExpenseRes.status}`);
        console.log('Response:', createExpenseRes.body);
      }
    } else {
      logTest('Create expense', false, 'No test account available');
    }

    // Get expenses
    const getExpensesRes = await makeRequest('GET', '/api/accounting/expenses', null, accessToken);
    if (getExpensesRes.status === 200 && getExpensesRes.body.data) {
      logTest('Get expenses', true, `Count: ${getExpensesRes.body.data.length}`);
    } else {
      logTest('Get expenses', false, `Status: ${getExpensesRes.status}`);
    }

    // Get expense by ID
    if (testExpenseId) {
      const getExpenseRes = await makeRequest('GET', `/api/accounting/expenses/${testExpenseId}`, null, accessToken);
      if (getExpenseRes.status === 200 && getExpenseRes.body.data) {
        logTest('Get expense by ID', true);
      } else {
        logTest('Get expense by ID', false, `Status: ${getExpenseRes.status}`);
      }
    }

    // Get expense stats by category
    const getExpStatsRes = await makeRequest('GET', '/api/accounting/expenses/stats/by-category', null, accessToken);
    if (getExpStatsRes.status === 200 && getExpStatsRes.body.data) {
      logTest('Get expense stats by category', true);
    } else {
      logTest('Get expense stats by category', false, `Status: ${getExpStatsRes.status}`);
    }

    // Step 9: Test Income endpoints
    console.log('\n9. Testing Income endpoints...');

    if (testAccountId) {
      // Create income
      const incomeData = {
        amount: 500,
        account_id: testAccountId,
        category_id: testIncomeCategoryId,
        date: new Date().toISOString().split('T')[0],
        description: 'Test income'
      };
      const createIncomeRes = await makeRequest('POST', '/api/accounting/incomes', incomeData, accessToken);
      if (createIncomeRes.status === 201 && createIncomeRes.body.data) {
        testIncomeId = createIncomeRes.body.data.id;
        logTest('Create income', true, `ID: ${testIncomeId}`);
      } else {
        logTest('Create income', false, `Status: ${createIncomeRes.status}`);
        console.log('Response:', createIncomeRes.body);
      }
    } else {
      logTest('Create income', false, 'No test account available');
    }

    // Get incomes
    const getIncomesRes = await makeRequest('GET', '/api/accounting/incomes', null, accessToken);
    if (getIncomesRes.status === 200 && getIncomesRes.body.data) {
      logTest('Get incomes', true, `Count: ${getIncomesRes.body.data.length}`);
    } else {
      logTest('Get incomes', false, `Status: ${getIncomesRes.status}`);
    }

    // Get income by ID
    if (testIncomeId) {
      const getIncomeRes = await makeRequest('GET', `/api/accounting/incomes/${testIncomeId}`, null, accessToken);
      if (getIncomeRes.status === 200 && getIncomeRes.body.data) {
        logTest('Get income by ID', true);
      } else {
        logTest('Get income by ID', false, `Status: ${getIncomeRes.status}`);
      }
    }

    // Step 10: Test Transfer endpoints
    console.log('\n10. Testing Transfer endpoints...');

    // Create second account for transfer
    const account2Data = {
      name: 'Test Account 2',
      type: 'bank',
      currency: 'ARS',
      initial_balance: 500
    };
    const createAccount2Res = await makeRequest('POST', '/api/accounting/accounts', account2Data, accessToken);
    let testAccount2Id = null;
    if (createAccount2Res.status === 201 && createAccount2Res.body.data) {
      testAccount2Id = createAccount2Res.body.data.id;
      logTest('Create second account', true, `ID: ${testAccount2Id}`);
    }

    if (testAccountId && testAccount2Id) {
      // Create transfer
      const transferData = {
        amount: 50,
        from_account_id: testAccountId,
        to_account_id: testAccount2Id,
        transfer_type_id: testTransferTypeId,
        date: new Date().toISOString().split('T')[0],
        description: 'Test transfer'
      };
      const createTransferRes = await makeRequest('POST', '/api/accounting/transfers', transferData, accessToken);
      if (createTransferRes.status === 201 && createTransferRes.body.data) {
        testTransferId = createTransferRes.body.data.id;
        logTest('Create transfer', true, `ID: ${testTransferId}`);
      } else {
        logTest('Create transfer', false, `Status: ${createTransferRes.status}`);
        console.log('Response:', createTransferRes.body);
      }
    } else {
      logTest('Create transfer', false, 'Missing accounts');
    }

    // Get transfers
    const getTransfersRes = await makeRequest('GET', '/api/accounting/transfers', null, accessToken);
    if (getTransfersRes.status === 200 && getTransfersRes.body.data) {
      logTest('Get transfers', true, `Count: ${getTransfersRes.body.data.length}`);
    } else {
      logTest('Get transfers', false, `Status: ${getTransfersRes.status}`);
    }

    // Step 11: Test Dashboard endpoint
    console.log('\n11. Testing Dashboard endpoint...');

    const getDashboardRes = await makeRequest('GET', '/api/accounting/dashboard', null, accessToken);
    if (getDashboardRes.status === 200 && getDashboardRes.body.data) {
      logTest('Get dashboard', true);
      console.log('\n=== DASHBOARD DATA ===');
      console.log(JSON.stringify(getDashboardRes.body.data, null, 2));
    } else {
      logTest('Get dashboard', false, `Status: ${getDashboardRes.status}`);
      console.log('Response:', getDashboardRes.body);
    }

    // Get dashboard monthly
    const getDashboardMonthlyRes = await makeRequest('GET', '/api/accounting/dashboard/monthly', null, accessToken);
    if (getDashboardMonthlyRes.status === 200 && getDashboardMonthlyRes.body.data) {
      logTest('Get dashboard monthly', true);
    } else {
      logTest('Get dashboard monthly', false, `Status: ${getDashboardMonthlyRes.status}`);
    }

    // Step 12: Test Cash Reconciliation endpoints
    console.log('\n12. Testing Cash Reconciliation endpoints...');

    if (testAccountId) {
      // Calculate expected balance
      const calcBalanceRes = await makeRequest('GET', `/api/accounting/cash-reconciliations/calculate/${testAccountId}/${new Date().toISOString().split('T')[0]}`, null, accessToken);
      if (calcBalanceRes.status === 200 && calcBalanceRes.body.data) {
        logTest('Calculate expected balance', true);
      } else {
        logTest('Calculate expected balance', false, `Status: ${calcBalanceRes.status}`);
      }

      // Create cash reconciliation
      const reconciliationData = {
        account_id: testAccountId,
        date: new Date().toISOString().split('T')[0],
        opening_balance: 1000,
        closing_balance: 1400,
        expected_balance: 1400,
        notes: 'Test reconciliation'
      };
      const createReconciliationRes = await makeRequest('POST', '/api/accounting/cash-reconciliations', reconciliationData, accessToken);
      if (createReconciliationRes.status === 201 && createReconciliationRes.body.data) {
        logTest('Create cash reconciliation', true);
      } else {
        logTest('Create cash reconciliation', false, `Status: ${createReconciliationRes.status}`);
        console.log('Response:', createReconciliationRes.body);
      }

      // Get cash reconciliations
      const getReconciliationsRes = await makeRequest('GET', '/api/accounting/cash-reconciliations', null, accessToken);
      if (getReconciliationsRes.status === 200 && getReconciliationsRes.body.data) {
        logTest('Get cash reconciliations', true, `Count: ${getReconciliationsRes.body.data.length}`);
      } else {
        logTest('Get cash reconciliations', false, `Status: ${getReconciliationsRes.status}`);
      }
    }

    // Print summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Total tests: ${results.passed + results.failed}`);
    console.log(`\x1b[32mPassed: ${results.passed}\x1b[0m`);
    console.log(`\x1b[31mFailed: ${results.failed}\x1b[0m`);

    if (results.failed > 0) {
      console.log('\n=== FAILED TESTS ===');
      results.tests.filter(t => !t.passed).forEach(t => {
        console.log(`\x1b[31m✗\x1b[0m ${t.name}: ${t.message}`);
      });
    }

  } catch (error) {
    console.error('\n\x1b[31mERROR:\x1b[0m', error.message);
    console.error(error.stack);
  }
}

// Run the tests
runTests().then(() => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
