/**
 * Script to create an admin user
 * Usage: node scripts/create_admin_user.js <username> <password> [email]
 */

const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../models');

async function createAdminUser() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node scripts/create_admin_user.js <username> <password> [email]');
    console.error('Example: node scripts/create_admin_user.js admin SecurePass123! admin@example.com');
    process.exit(1);
  }

  const [username, password, email] = args;

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long');
    process.exit(1);
  }

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected successfully');

    // Check if user already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      console.error(`Error: User "${username}" already exists`);

      // Offer to promote existing user to admin
      if (existingUser.role === 'admin') {
        console.log(`User "${username}" is already an administrator`);
      } else {
        console.log(`\nTo promote "${username}" to admin, use:`);
        console.log(`node scripts/promote_to_admin.js ${username}`);
      }
      process.exit(1);
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);
    console.log(passwordHash);

    // Create admin user
    console.log('Creating admin user...');
    const admin = await User.create({
      username,
      password_hash: passwordHash,
      email: email || null,
      role: 'admin',
      is_active: true
    });

    console.log('\n✓ Admin user created successfully!');
    console.log('────────────────────────────────────');
    console.log(`User ID: ${admin.id}`);
    console.log(`Username: ${admin.username}`);
    console.log(`Email: ${admin.email || '(not set)'}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Active: ${admin.is_active ? 'Yes' : 'No'}`);
    console.log('────────────────────────────────────');
    console.log('\nYou can now login with these credentials.');

    process.exit(0);

  } catch (error) {
    console.error('Error creating admin user:', error.message);
    if (error.name === 'SequelizeValidationError') {
      error.errors.forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }
    process.exit(1);
  }
}

// Run the script
createAdminUser();
