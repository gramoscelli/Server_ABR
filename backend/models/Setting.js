/**
 * Setting Model
 * Stores system configuration as key-value pairs
 * Used for email settings, general config, etc.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Setting key (e.g., smtp_host, smtp_port)'
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Setting value (stored as string, parsed by application)'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'general',
    comment: 'Category for grouping settings (email, security, general)'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Human-readable description of the setting'
  },
  is_secret: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'If true, value should be encrypted/masked'
  }
}, {
  tableName: 'settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/**
 * Get a setting by key
 * @param {string} key - Setting key
 * @param {*} defaultValue - Default value if not found
 * @returns {Promise<*>} Setting value
 */
Setting.getValue = async function(key, defaultValue = null) {
  const setting = await this.findOne({ where: { key } });
  return setting ? setting.value : defaultValue;
};

/**
 * Set a setting value
 * @param {string} key - Setting key
 * @param {*} value - Value to store
 * @param {object} options - Additional options (category, description, is_secret)
 * @returns {Promise<Setting>} Created/updated setting
 */
Setting.setValue = async function(key, value, options = {}) {
  const [setting, created] = await this.upsert({
    key,
    value: value !== null ? String(value) : null,
    ...options
  });
  return setting;
};

/**
 * Get all settings by category
 * @param {string} category - Category name
 * @returns {Promise<Object>} Key-value pairs
 */
Setting.getByCategory = async function(category) {
  const settings = await this.findAll({ where: { category } });
  const result = {};
  for (const setting of settings) {
    result[setting.key] = setting.is_secret ? '********' : setting.value;
  }
  return result;
};

/**
 * Get all email settings
 * @returns {Promise<Object>} Email configuration object
 */
Setting.getEmailSettings = async function() {
  const settings = await this.findAll({ where: { category: 'email' } });
  const config = {
    provider: 'smtp', // smtp, resend, sendgrid
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: 'Biblio Admin',
    resend_api_key: '',
    enabled: false
  };

  for (const setting of settings) {
    if (setting.key in config) {
      // Parse boolean/number values
      let value = setting.value;
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value) && value !== '') value = parseInt(value);

      config[setting.key] = value;
    }
  }

  return config;
};

/**
 * Save email settings
 * @param {Object} emailConfig - Email configuration object
 * @returns {Promise<void>}
 */
Setting.saveEmailSettings = async function(emailConfig) {
  const keys = [
    'provider', 'smtp_host', 'smtp_port', 'smtp_secure',
    'smtp_user', 'smtp_password', 'smtp_from_email', 'smtp_from_name',
    'resend_api_key', 'enabled'
  ];

  for (const key of keys) {
    if (key in emailConfig) {
      const isSecret = ['smtp_password', 'resend_api_key'].includes(key);
      await this.setValue(key, emailConfig[key], {
        category: 'email',
        is_secret: isSecret
      });
    }
  }
};

module.exports = Setting;
