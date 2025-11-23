# Test Suite Documentation

**Project:** biblio-server API
**Testing Framework:** Jest
**Test Coverage Goal:** 70%+

---

## 📁 Directory Structure

```
test/
├── README.md                 # This file
├── setup.js                  # Jest global setup
├── fixtures/                 # Test data fixtures
│   └── users.js              # User test data
├── unit/                     # Unit tests
│   ├── models/               # Model tests
│   │   ├── User.test.js
│   │   └── ApiKey.test.js
│   └── middleware/           # Middleware tests
│       └── sanitize.test.js
└── integration/              # Integration tests
    ├── auth.test.js          # Authentication routes
    └── admin.test.js         # Admin routes
```

---

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Run Tests in Watch Mode (during development)
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npm test -- test/unit/models/User.test.js
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="should login"
```

---

## 🧪 Test Types

### Unit Tests (`test/unit/`)
Test individual components in isolation:
- **Models** - Database model methods and validation
- **Middleware** - Input sanitization, authentication logic
- **Utilities** - Helper functions

### Integration Tests (`test/integration/`)
Test complete request/response cycles:
- **Routes** - HTTP endpoints with authentication
- **Database Operations** - Real database interactions
- **End-to-End Flows** - Complete user journeys

---

## 📊 Test Coverage

Current coverage thresholds (70%):
- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

View coverage report:
```bash
npm test -- --coverage
# Open: coverage/lcov-report/index.html
```

---

## 🔧 Test Configuration

### Environment Variables

Tests use a separate test database to avoid conflicts:

```bash
# .env.test (create this file)
NODE_ENV=test
TEST_MYSQL_HOST=localhost
TEST_MYSQL_PORT=3306
TEST_MYSQL_USER=root
TEST_MYSQL_PASSWORD=password
TEST_MYSQL_DATABASE=biblio_test
JWT_SECRET=test-secret-key
ALLOWED_ORIGINS=http://localhost:3000
```

### Jest Configuration (`jest.config.js`)

```javascript
{
  testEnvironment: 'node',
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js'
  ]
}
```

---

## ✅ Test Checklist

When writing new tests, ensure:

- [ ] Test file follows naming convention: `*.test.js`
- [ ] Tests are grouped with `describe()` blocks
- [ ] Each test has clear description with `test()` or `it()`
- [ ] Database is cleaned up in `beforeEach()` or `afterEach()`
- [ ] Async operations use `async/await`
- [ ] Assertions are specific and meaningful
- [ ] Edge cases are covered
- [ ] Error cases are tested
- [ ] Mocks are cleaned up after tests

---

## 📝 Writing Tests

### Basic Test Structure

```javascript
describe('Feature Name', () => {
  beforeAll(async () => {
    // Run once before all tests
    await sequelize.authenticate();
  });

  afterAll(async () => {
    // Run once after all tests
    await sequelize.close();
  });

  beforeEach(async () => {
    // Run before each test
    await User.destroy({ where: {}, force: true });
  });

  test('should do something', async () => {
    // Arrange
    const user = await User.create({...});

    // Act
    const result = await user.someMethod();

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Testing Models

```javascript
const { User } = require('../../../models');

test('should create user', async () => {
  const user = await User.create({
    username: 'testuser',
    password_hash: 'hash',
    email: 'test@example.com'
  });

  expect(user.id).toBeDefined();
  expect(user.username).toBe('testuser');
});
```

### Testing Routes

```javascript
const request = require('supertest');
const app = require('../../../app');

test('should login user', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username: 'test', password: 'password' });

  expect(response.status).toBe(200);
  expect(response.body.accessToken).toBeDefined();
});
```

### Testing Middleware

```javascript
const { sanitizeUsername } = require('../../../middleware/sanitize');

test('should sanitize username', () => {
  const result = sanitizeUsername('<script>user</script>');

  expect(result).toBe('scriptuser');
  expect(result).not.toContain('<');
});
```

---

## 🎯 Test Data Fixtures

Use fixtures for consistent test data:

```javascript
const testUsers = require('../fixtures/users');

test('should use fixture data', async () => {
  const user = await User.create(testUsers.validUser);
  // ...
});
```

### Available Fixtures

- `testUsers.validUser` - Standard user account
- `testUsers.adminUser` - Admin account
- `testUsers.lockedUser` - Locked account
- `testUsers.inactiveUser` - Inactive account

---

## 🐛 Debugging Tests

### Run Single Test
```bash
npm test -- -t "should login successfully"
```

### Enable Verbose Output
```bash
npm test -- --verbose
```

### Show Console Logs
```javascript
// Temporarily unmock console in test
global.console.log = jest.fn((msg) => process.stdout.write(msg + '\n'));
```

### Use Debugger
```javascript
test('debug test', async () => {
  debugger; // Use with --inspect-brk
  const result = await someFunction();
});
```

Run with debugger:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## 🔒 Security Testing

### XSS Prevention Tests

```javascript
test('should prevent XSS in username', () => {
  const malicious = '<script>alert("XSS")</script>';
  const safe = sanitizeUsername(malicious);

  expect(safe).not.toContain('<script>');
});
```

### SQL Injection Prevention

Sequelize automatically prevents SQL injection, but verify:

```javascript
test('should prevent SQL injection', async () => {
  const malicious = "'; DROP TABLE usuarios; --";
  await expect(
    User.findByUsername(malicious)
  ).resolves.not.toThrow();
});
```

### Authentication Tests

```javascript
test('should reject invalid token', async () => {
  const response = await request(app)
    .get('/api/admin/users')
    .set('Authorization', 'Bearer invalid-token');

  expect(response.status).toBe(403);
});
```

---

## 📈 Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: biblio_test
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

---

## 🚨 Common Issues

### Issue: Database Connection Timeout

**Solution:** Increase Jest timeout
```javascript
jest.setTimeout(15000);
```

### Issue: Tests Affecting Each Other

**Solution:** Clean database in `beforeEach()`
```javascript
beforeEach(async () => {
  await User.destroy({ where: {}, truncate: true });
});
```

### Issue: Sequelize Not Closing

**Solution:** Force close in `afterAll()`
```javascript
afterAll(async () => {
  await sequelize.close();
});
```

### Issue: Port Already in Use

**Solution:** Don't start server in tests, use supertest
```javascript
// Don't do this in tests:
// app.listen(3000);

// Do this:
const request = require('supertest');
await request(app).get('/endpoint');
```

---

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Sequelize Testing](https://sequelize.org/docs/v6/other-topics/migrations/)

---

## ✅ Test Coverage Goals

| Component | Current | Goal |
|-----------|---------|------|
| Models | 85% | 80% |
| Routes | 75% | 70% |
| Middleware | 80% | 75% |
| **Overall** | **78%** | **70%** |

---

**Last Updated:** 2025-11-06
**Maintainer:** Development Team
