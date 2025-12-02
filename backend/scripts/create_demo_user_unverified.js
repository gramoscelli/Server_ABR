/**
 * Script to create a demo user WITHOUT email verification
 * This user is used to test the email verification workflow
 */

const bcrypt = require('bcryptjs');
const { User, Role, sequelize } = require('../models');

async function createDemoUser() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected successfully');

    // Find the new_user role
    const newUserRole = await Role.findOne({ where: { name: 'new_user' } });
    if (!newUserRole) {
      console.error('Error: new_user role not found');
      process.exit(1);
    }

    console.log(`Using role: ${newUserRole.name} (ID: ${newUserRole.id})`);

    const demoUsername = 'demousuario';
    const demoPassword = 'DemoPass123!';
    const demoEmail = 'demousuario@example.com';

    // Check if demo user already exists
    const existingUser = await User.findOne({ where: { username: demoUsername } });
    if (existingUser) {
      console.log(`\nDemo user "${demoUsername}" already exists!`);
      console.log('────────────────────────────────────');
      console.log(`User ID: ${existingUser.id}`);
      console.log(`Username: ${existingUser.username}`);
      console.log(`Email: ${existingUser.email || '(not set)'}`);
      console.log(`Email Verified: ${existingUser.email_verified ? 'YES ✅' : 'NO ❌'}`);
      console.log(`Role: ${existingUser.role_id}`);
      console.log(`Active: ${existingUser.is_active ? 'Yes' : 'No'}`);
      console.log('────────────────────────────────────');
      console.log('\nThis user can be used to test the email verification workflow:');
      console.log(`Username: ${demoUsername}`);
      console.log(`Email: ${demoEmail}`);
      console.log('────────────────────────────────────');
      process.exit(0);
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(demoPassword, 10);

    // Create demo user WITHOUT email verification
    console.log('Creating demo user...');
    const demoUser = await User.create({
      username: demoUsername,
      password_hash: passwordHash,
      email: demoEmail,
      role_id: newUserRole.id,
      is_active: true,
      email_verified: false,  // Key difference: email is NOT verified
      email_verification_token: null,
      email_verification_expires: null
    });

    console.log('\n✓ Demo user created successfully!');
    console.log('────────────────────────────────────');
    console.log(`User ID: ${demoUser.id}`);
    console.log(`Username: ${demoUser.username}`);
    console.log(`Email: ${demoUser.email}`);
    console.log(`Email Verified: NO ❌ (This is the key!)`);
    console.log(`Role: ${newUserRole.name} (ID: ${demoUser.role_id})`);
    console.log(`Active: ${demoUser.is_active ? 'Yes' : 'No'}`);
    console.log('────────────────────────────────────');
    console.log('\nDemo user info:');
    console.log(`Username: ${demoUsername}`);
    console.log(`Email: ${demoEmail}`);
    console.log('────────────────────────────────────');
    console.log('\nYou can now:');
    console.log('1. Go to Admin → Users panel');
    console.log('2. Find "demousuario" in the list');
    console.log('3. You will see:');
    console.log('   - 🟢 Green button (MailCheck) to verify email');
    console.log('   - 🟠 Orange button (Mail) to resend verification');
    console.log('   - Dropdown to change role (approve the user)');
    console.log('────────────────────────────────────');
    console.log('\n⚠️  NOTE: This user cannot login until their email is verified!');

    process.exit(0);

  } catch (error) {
    console.error('Error creating demo user:', error.message);
    if (error.name === 'SequelizeValidationError') {
      error.errors.forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }
    process.exit(1);
  }
}

// Run the script
createDemoUser();
