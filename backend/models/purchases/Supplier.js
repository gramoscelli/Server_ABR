/**
 * Supplier Model
 * Represents vendors/suppliers for purchases
 */

const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const Supplier = accountingDb.define('suppliers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  business_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  trade_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Nombre de fantasía'
  },
  cuit: {
    type: DataTypes.STRING(13),
    allowNull: true,
    unique: true,
    comment: 'CUIT format: XX-XXXXXXXX-X'
  },
  tax_condition: {
    type: DataTypes.ENUM('responsable_inscripto', 'monotributista', 'exento', 'consumidor_final', 'otro'),
    defaultValue: 'responsable_inscripto'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'supplier_categories',
      key: 'id'
    }
  },
  contact_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  mobile: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  province: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  postal_code: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  bank_account_type: {
    type: DataTypes.ENUM('caja_ahorro', 'cuenta_corriente'),
    allowNull: true
  },
  bank_account_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  bank_cbu: {
    type: DataTypes.STRING(22),
    allowNull: true
  },
  bank_alias: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  payment_terms: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Condiciones de pago habituales'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rating: {
    type: DataTypes.TINYINT.UNSIGNED,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Rating 1-5'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'References abr.usuarios.id'
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
  tableName: 'suppliers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Supplier;
