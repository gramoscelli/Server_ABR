/**
 * Script to create a test user for development/testing
 * This user has a simple known password for testing purposes
 */

const bcrypt = require('bcryptjs');
const { User, Role, sequelize } = require('../models');

async function createTestUser() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected successfully');

    // Find or create test user role (library_employee or admin)
    const testRole = await Role.findOne({ where: { name: 'library_employee' } });
    if (!testRole) {
      console.error('Error: library_employee role not found');
      process.exit(1);
    }

    console.log(`Using role: ${testRole.name} (ID: ${testRole.id})`);

    const testUsername = 'test_user';
    const testPassword = 'Test123456!';
    const testEmail = 'test@example.com';

    // Check if test user already exists
    const existingUser = await User.findOne({ where: { username: testUsername } });
    if (existingUser) {
      console.log(`\nTest user "${testUsername}" already exists!`);
      console.log('────────────────────────────────────');
      console.log(`User ID: ${existingUser.id}`);
      console.log(`Username: ${existingUser.username}`);
      console.log(`Email: ${existingUser.email || '(not set)'}`);
      console.log(`Role ID: ${existingUser.role_id}`);
      console.log(`Active: ${existingUser.is_active ? 'Yes' : 'No'}`);
      console.log('────────────────────────────────────');
      console.log('\nYou can use these credentials to login:');
      console.log(`Username: ${testUsername}`);
      console.log(`Password: ${testPassword}`);
      process.exit(0);
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // Create test user
    console.log('Creating test user...');
    const testUser = await User.create({
      username: testUsername,
      password_hash: passwordHash,
      email: testEmail,
      role_id: testRole.id,
      is_active: true,
      email_verified: true  // Skip email verification for test user
    });

    console.log('\n✓ Test user created successfully!');
    console.log('────────────────────────────────────');
    console.log(`User ID: ${testUser.id}`);
    console.log(`Username: ${testUser.username}`);
    console.log(`Email: ${testUser.email}`);
    console.log(`Role: ${testRole.name} (ID: ${testUser.role_id})`);
    console.log(`Active: ${testUser.is_active ? 'Yes' : 'No'}`);
    console.log('────────────────────────────────────');
    console.log('\nTest credentials:');
    console.log(`Username: ${testUsername}`);
    console.log(`Password: ${testPassword}`);
    console.log('\n⚠️  WARNING: This user is for testing purposes only!');
    console.log('   Do not use in production environments.');

    process.exit(0);

  } catch (error) {
    console.error('Error creating test user:', error.message);
    if (error.name === 'SequelizeValidationError') {
      error.errors.forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }
    process.exit(1);
  }
}

// Run the script
createTestUser();
