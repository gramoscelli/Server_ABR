const { DataTypes } = require('sequelize');
const { accountingDb } = require('../../config/database');

const PlanDeCuentas = accountingDb.define(
  'plan_de_cuentas',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: 'Account code (e.g., 1101, 4101, 5501)'
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Account name'
    },
    tipo: {
      type: DataTypes.ENUM('activo', 'pasivo', 'ingreso', 'egreso'),
      allowNull: false,
      comment: 'Account type'
    },
    grupo: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Group prefix (11, 12, 41, 51, etc.)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'plan_de_cuentas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: false
  }
);

module.exports = PlanDeCuentas;
