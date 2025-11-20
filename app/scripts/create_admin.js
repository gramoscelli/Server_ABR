#!/usr/bin/env node
/**
 * Secure Admin User Creation Script
 * Creates an admin user with a strong password
 * Usage: node scripts/create_admin.js
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const readline = require('readline');

// Create readline interface for secure password input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Hide password input
function hideInput() {
  const stdin = process.stdin;
  stdin.on('data', char => {
    char = char.toString();
    if (char === '\n' || char === '\r' || char === '\u0004') {
      stdin.pause();
    } else {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write('Password: ' + '*'.repeat(rl.line.length));
    }
  });
}

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  console.log('\n=== Secure Admin User Creation ===\n');

  // Get credentials
  const username = await question('Enter admin username: ');

  if (!username || username.length < 3) {
    console.error('❌ Username must be at least 3 characters');
    rl.close();
    process.exit(1);
  }

  const email = await question('Enter admin email: ');

  console.log('Enter password (min 12 characters, must include uppercase, lowercase, number, and special char):');
  const password = await question('Password: ');
  const confirmPassword = await question('Confirm password: ');

  if (password !== confirmPassword) {
    console.error('❌ Passwords do not match');
    rl.close();
    process.exit(1);
  }

  // Validate password strength
  if (password.length < 12) {
    console.error('❌ Password must be at least 12 characters long');
    rl.close();
    process.exit(1);
  }

  if (!/[a-z]/.test(password)) {
    console.error('❌ Password must contain at least one lowercase letter');
    rl.close();
    process.exit(1);
  }

  if (!/[A-Z]/.test(password)) {
    console.error('❌ Password must contain at least one uppercase letter');
    rl.close();
    process.exit(1);
  }

  if (!/[0-9]/.test(password)) {
    console.error('❌ Password must contain at least one number');
    rl.close();
    process.exit(1);
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    console.error('❌ Password must contain at least one special character');
    rl.close();
    process.exit(1);
  }

  rl.close();

  console.log('\n🔐 Hashing password...');
  const passwordHash = await bcrypt.hash(password, 10);

  // Connect to database
  console.log('📡 Connecting to database...');

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'abr'
  });

  try {
    // Check if username already exists
    const [existing] = await connection.query(
      'SELECT id FROM usuarios WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      console.error(`❌ Username "${username}" already exists`);
      process.exit(1);
    }

    // Insert admin user
    const [result] = await connection.query(
      'INSERT INTO usuarios (username, password_hash, email, role, active) VALUES (?, ?, ?, ?, ?)',
      [username, passwordHash, email, 'admin', true]
    );

    console.log('\n✅ Admin user created successfully!');
    console.log(`   User ID: ${result.insertId}`);
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: admin`);
    console.log('\n🔑 You can now login with these credentials.');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run
createAdmin().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
