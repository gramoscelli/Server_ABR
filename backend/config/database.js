/**
 * Sequelize Database Configuration
 * Centralized database connection using Sequelize ORM
 */

const { Sequelize } = require('sequelize');

// Validate environment variables
if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE || !process.env.MYSQL_USER) {
  console.error('FATAL ERROR: Database environment variables are not set!');
  console.error('Required: MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD');
  process.exit(1);
}

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',

    // Character set configuration for UTF-8 support
    dialectOptions: {
      charset: 'utf8mb4'
    },

    // Connection pool configuration
    pool: {
      max: 10,              // Maximum number of connections
      min: 0,               // Minimum number of connections
      acquire: 30000,       // Maximum time to get connection (30s)
      idle: 10000           // Maximum idle time before release (10s)
    },

    // Logging configuration
    logging: process.env.NODE_ENV === 'development' ? console.log : false,

    // Timezone configuration
    timezone: '+00:00',

    // Define options
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,  // Prevent Sequelize from pluralizing table names
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },

    // Retry configuration
    retry: {
      max: 3
    }
  }
);

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    return false;
  }
}

/**
 * Close database connection gracefully
 */
async function closeConnection() {
  try {
    await sequelize.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

// Accounting database configuration
const accountingDb = new Sequelize(
  process.env.ACCOUNTING_DATABASE || 'accounting',
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4'
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+00:00',
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    retry: {
      max: 3
    }
  }
);

/**
 * Test accounting database connection
 */
async function testAccountingConnection() {
  try {
    await accountingDb.authenticate();
    console.log('✅ Accounting database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to accounting database:', error.message);
    return false;
  }
}

module.exports = {
  sequelize,
  accountingDb,
  testConnection,
  testAccountingConnection,
  closeConnection
};
