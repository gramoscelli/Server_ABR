/**
 * PurchaseSettings Model
 * Configuration settings for the purchase module
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const PurchaseSettings = accountingDb.define('purchase_settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  setting_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  setting_value: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'purchase_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/**
 * Get a setting value by key
 * @param {string} key - The setting key
 * @param {*} defaultValue - Default value if not found
 * @returns {Promise<*>}
 */
PurchaseSettings.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ where: { setting_key: key } });
  return setting ? setting.setting_value : defaultValue;
};

/**
 * Get a numeric setting value
 * @param {string} key - The setting key
 * @param {number} defaultValue - Default value if not found
 * @returns {Promise<number>}
 */
PurchaseSettings.getNumericSetting = async function(key, defaultValue = 0) {
  const value = await this.getSetting(key, defaultValue);
  return parseFloat(value) || defaultValue;
};

/**
 * Set a setting value
 * @param {string} key - The setting key
 * @param {*} value - The value to set
 * @param {string} description - Optional description
 * @returns {Promise<PurchaseSettings>}
 */
PurchaseSettings.setSetting = async function(key, value, description = null) {
  const [setting] = await this.upsert({
    setting_key: key,
    setting_value: String(value),
    description: description
  });
  return setting;
};

module.exports = PurchaseSettings;
