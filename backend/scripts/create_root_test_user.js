#!/usr/bin/env node
/**
 * Script to create a root test user for development/testing
 * Creates a user with root role, verified email, and ready to use
 *
 * Usage:
 *   node scripts/create_root_test_user.js
 *   node scripts/create_root_test_user.js <username> <password> [email]
 *
 * Examples:
 *   node scripts/create_root_test_user.js
 *   node scripts/create_root_test_user.js admin admin123
 *   node scripts/create_root_test_user.js testadmin TestPass123! admin@test.com
 *
 * Docker usage:
 *   docker exec -it nodejs node scripts/create_root_test_user.js
 */

const bcrypt = require('bcryptjs');
const { User, Role, sequelize } = require('../models');

// Default credentials
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123';
const DEFAULT_EMAIL = 'admin@localhost';

async function createRootTestUser() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const username = args[0] || DEFAULT_USERNAME;
    const password = args[1] || DEFAULT_PASSWORD;
    const email = args[2] || DEFAULT_EMAIL;

    console.log('╔══════════════════════════════════════════╗');
    console.log('║   ROOT TEST USER CREATION SCRIPT         ║');
    console.log('╚══════════════════════════════════════════╝\n');

    // Connect to database
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connected successfully\n');

    // Find root role
    console.log('Looking for root role...');
    const rootRole = await Role.findOne({ where: { name: 'root' } });
    if (!rootRole) {
      console.error('✗ Error: "root" role not found in database');
      console.error('  Make sure migration 015_add_root_role.sql has been executed');
      process.exit(1);
    }
    console.log(`✓ Found role: ${rootRole.name} (ID: ${rootRole.id})\n`);

    // Check if user already exists
    console.log(`Checking if user "${username}" exists...`);
    const existingUser = await User.findOne({ where: { username } });

    if (existingUser) {
      console.log(`\n⚠️  User "${username}" already exists!`);
      console.log('────────────────────────────────────────────');
      console.log(`  User ID:        ${existingUser.id}`);
      console.log(`  Username:       ${existingUser.username}`);
      console.log(`  Email:          ${existingUser.email || '(not set)'}`);
      console.log(`  Role ID:        ${existingUser.role_id}`);
      console.log(`  Active:         ${existingUser.is_active ? 'Yes' : 'No'}`);
      console.log(`  Email Verified: ${existingUser.email_verified ? 'Yes' : 'No'}`);
      console.log('────────────────────────────────────────────');

      // Offer to update existing user
      console.log('\nUpdating existing user to root role with new password...');
      const passwordHash = await bcrypt.hash(password, 10);

      await existingUser.update({
        password_hash: passwordHash,
        role_id: rootRole.id,
        is_active: true,
        email_verified: true,
        must_change_password: false,
        failed_attempts: 0,
        locked_until: null
      });

      console.log('✓ User updated successfully!\n');
      console.log('╔══════════════════════════════════════════╗');
      console.log('║   LOGIN CREDENTIALS                      ║');
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║   Username: ${username.padEnd(28)}║`);
      console.log(`║   Password: ${password.padEnd(28)}║`);
      console.log('╚══════════════════════════════════════════╝');

      process.exit(0);
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);
    console.log(`✓ Password hash generated: ${passwordHash.substring(0, 20)}...\n`);

    // Create root test user
    console.log('Creating root test user...');
    const testUser = await User.create({
      username: username,
      password_hash: passwordHash,
      email: email,
      role_id: rootRole.id,
      is_active: true,
      email_verified: true,      // Skip email verification
      must_change_password: false, // No forced password change for test user
      failed_attempts: 0
    });

    console.log('\n✓ Root test user created successfully!');
    console.log('────────────────────────────────────────────');
    console.log(`  User ID:        ${testUser.id}`);
    console.log(`  Username:       ${testUser.username}`);
    console.log(`  Email:          ${testUser.email}`);
    console.log(`  Role:           ${rootRole.name} (ID: ${testUser.role_id})`);
    console.log(`  Active:         ${testUser.is_active ? 'Yes' : 'No'}`);
    console.log(`  Email Verified: ${testUser.email_verified ? 'Yes' : 'No'}`);
    console.log('────────────────────────────────────────────');

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   LOGIN CREDENTIALS                      ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║   Username: ${username.padEnd(28)}║`);
    console.log(`║   Password: ${password.padEnd(28)}║`);
    console.log('╚══════════════════════════════════════════╝');

    console.log('\n⚠️  WARNING: This user is for TESTING purposes only!');
    console.log('   Do not use default credentials in production environments.\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error creating root test user:', error.message);
    if (error.name === 'SequelizeValidationError') {
      console.error('\nValidation errors:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path}: ${err.message}`);
      });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('\nUnique constraint violation:');
      console.error(`  A user with this ${error.fields ? Object.keys(error.fields).join(', ') : 'value'} already exists`);
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('\nFull error:', error);
    }
    process.exit(1);
  }
}

// Run the script
createRootTestUser();
