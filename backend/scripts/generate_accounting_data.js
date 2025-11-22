#!/usr/bin/env node
/**
 * Generate Synthetic Accounting Data
 * Creates realistic test data for the accounting module
 *
 * Usage:
 *   node scripts/generate_accounting_data.js
 *   node scripts/generate_accounting_data.js --months=6
 *   node scripts/generate_accounting_data.js --clear  # Clear existing data first
 *
 * Docker usage:
 *   docker compose exec backend node scripts/generate_accounting_data.js
 */

const {
  Account, Expense, Income, Transfer,
  ExpenseCategory, IncomeCategory, TransferType,
  CashReconciliation, accountingDb
} = require('../models/accounting');
const { User, Role, sequelize } = require('../models');

// Configuration
const DEFAULT_MONTHS = 3;
const args = process.argv.slice(2);
const MONTHS_TO_GENERATE = parseInt(args.find(a => a.startsWith('--months='))?.split('=')[1]) || DEFAULT_MONTHS;
const CLEAR_EXISTING = args.includes('--clear');

// Synthetic data templates
const ACCOUNTS_DATA = [
  { name: 'Caja Principal', type: 'cash', currency: 'ARS', initial_balance: 50000 },
  { name: 'Caja Chica', type: 'cash', currency: 'ARS', initial_balance: 10000 },
  { name: 'Banco Nación - Cuenta Corriente', type: 'bank', bank_name: 'Banco de la Nación Argentina', account_number: '0110012345678901234567', currency: 'ARS', initial_balance: 250000 },
  { name: 'Banco Provincia - Caja de Ahorro', type: 'bank', bank_name: 'Banco de la Provincia de Buenos Aires', account_number: '0140034567890123456789', currency: 'ARS', initial_balance: 180000 },
  { name: 'Mercado Pago', type: 'other', currency: 'ARS', initial_balance: 15000, notes: 'Cuenta digital para cobros online' }
];

const EXPENSE_CATEGORIES_DATA = [
  { name: 'Servicios', color: '#3498db', subcategories: [
    { name: 'Electricidad', color: '#f1c40f' },
    { name: 'Gas', color: '#e67e22' },
    { name: 'Agua', color: '#1abc9c' },
    { name: 'Internet/Teléfono', color: '#9b59b6' }
  ]},
  { name: 'Mantenimiento', color: '#e74c3c', subcategories: [
    { name: 'Limpieza', color: '#c0392b' },
    { name: 'Reparaciones', color: '#d35400' },
    { name: 'Jardinería', color: '#27ae60' }
  ]},
  { name: 'Suministros', color: '#2ecc71', subcategories: [
    { name: 'Papelería', color: '#16a085' },
    { name: 'Artículos de limpieza', color: '#1abc9c' },
    { name: 'Insumos varios', color: '#3498db' }
  ]},
  { name: 'Personal', color: '#9b59b6', subcategories: [
    { name: 'Sueldos', color: '#8e44ad' },
    { name: 'Cargas sociales', color: '#6c3483' },
    { name: 'Capacitación', color: '#7d3c98' }
  ]},
  { name: 'Biblioteca', color: '#34495e', subcategories: [
    { name: 'Libros nuevos', color: '#2c3e50' },
    { name: 'Suscripciones', color: '#5d6d7e' },
    { name: 'Encuadernación', color: '#7f8c8d' }
  ]},
  { name: 'Impuestos y tasas', color: '#95a5a6' },
  { name: 'Seguros', color: '#7f8c8d' },
  { name: 'Gastos bancarios', color: '#bdc3c7' },
  { name: 'Eventos', color: '#e91e63' },
  { name: 'Otros', color: '#607d8b' }
];

const INCOME_CATEGORIES_DATA = [
  { name: 'Cuotas de socios', color: '#27ae60', subcategories: [
    { name: 'Cuota mensual', color: '#2ecc71' },
    { name: 'Cuota anual', color: '#16a085' },
    { name: 'Inscripciones nuevas', color: '#1abc9c' }
  ]},
  { name: 'Donaciones', color: '#3498db', subcategories: [
    { name: 'Donaciones particulares', color: '#2980b9' },
    { name: 'Donaciones empresas', color: '#1a5276' }
  ]},
  { name: 'Eventos', color: '#e67e22', subcategories: [
    { name: 'Entradas eventos', color: '#d35400' },
    { name: 'Alquiler de espacio', color: '#ca6f1e' }
  ]},
  { name: 'Subvenciones', color: '#9b59b6', subcategories: [
    { name: 'Municipal', color: '#8e44ad' },
    { name: 'Provincial', color: '#7d3c98' },
    { name: 'Nacional', color: '#6c3483' }
  ]},
  { name: 'Intereses bancarios', color: '#1abc9c' },
  { name: 'Servicios de fotocopias', color: '#f39c12' },
  { name: 'Multas por atraso', color: '#c0392b' },
  { name: 'Otros ingresos', color: '#7f8c8d' }
];

const TRANSFER_TYPES_DATA = [
  { name: 'Transferencia bancaria', description: 'Transferencia entre cuentas bancarias' },
  { name: 'Depósito en efectivo', description: 'Depósito de efectivo a cuenta bancaria' },
  { name: 'Extracción', description: 'Extracción de banco a caja' },
  { name: 'Reposición caja chica', description: 'Transferencia a caja chica' }
];

// Expense descriptions by category
const EXPENSE_DESCRIPTIONS = {
  'Electricidad': ['Factura luz mes', 'Recargo mora electricidad', 'Instalación medidor'],
  'Gas': ['Factura gas mes', 'Servicio técnico calefacción'],
  'Agua': ['Factura agua bimestre', 'Reparación cañería'],
  'Internet/Teléfono': ['Servicio internet mensual', 'Llamadas larga distancia'],
  'Limpieza': ['Servicio limpieza mensual', 'Productos de limpieza'],
  'Reparaciones': ['Reparación aire acondicionado', 'Arreglo cerradura', 'Pintura paredes'],
  'Jardinería': ['Mantenimiento jardín', 'Plantas y macetas'],
  'Papelería': ['Resmas de papel', 'Tóner impresora', 'Útiles de oficina'],
  'Sueldos': ['Sueldos personal mes', 'Aguinaldo'],
  'Cargas sociales': ['Aportes jubilatorios', 'Obra social'],
  'Libros nuevos': ['Compra libros colección', 'Novedades literarias'],
  'Suscripciones': ['Suscripción revistas', 'Bases de datos online'],
  'Impuestos y tasas': ['Tasa municipal', 'Impuesto inmobiliario'],
  'Seguros': ['Seguro edificio', 'Seguro responsabilidad civil'],
  'Gastos bancarios': ['Comisión mantenimiento cuenta', 'Chequera'],
  'Eventos': ['Catering evento', 'Sonido e iluminación', 'Decoración'],
  'Otros': ['Gastos varios', 'Imprevistos']
};

// Income descriptions by category
const INCOME_DESCRIPTIONS = {
  'Cuota mensual': ['Cobro cuotas mes', 'Cuotas atrasadas'],
  'Cuota anual': ['Cuotas anuales anticipadas'],
  'Inscripciones nuevas': ['Nuevos socios mes'],
  'Donaciones particulares': ['Donación anónima', 'Donación Sr./Sra.'],
  'Donaciones empresas': ['Donación empresa local', 'Aporte corporativo'],
  'Entradas eventos': ['Venta entradas charla', 'Entradas presentación libro'],
  'Alquiler de espacio': ['Alquiler salón evento privado', 'Uso instalaciones'],
  'Municipal': ['Subvención municipal anual', 'Aporte extraordinario municipio'],
  'Provincial': ['Subvención provincial', 'Programa cultural provincial'],
  'Nacional': ['Subvención CONABIP', 'Programa nacional bibliotecas'],
  'Intereses bancarios': ['Intereses cuenta', 'Rendimiento plazo fijo'],
  'Servicios de fotocopias': ['Cobro fotocopias semana', 'Impresiones'],
  'Multas por atraso': ['Multas devolución tardía'],
  'Otros ingresos': ['Venta material reciclable', 'Ingresos varios']
};

// Helper functions
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return new Date(start + Math.random() * (end - start));
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function generateData() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   GENERADOR DE DATOS SINTÉTICOS - CONTABILIDAD  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  try {
    // Connect to databases
    console.log('Conectando a bases de datos...');
    await sequelize.authenticate();
    await accountingDb.authenticate();
    console.log('✓ Conexión establecida\n');

    // Get a user for created_by fields
    const user = await User.findOne();
    const userId = user?.id || 1;

    if (CLEAR_EXISTING) {
      console.log('⚠️  Limpiando datos existentes...');
      await CashReconciliation.destroy({ where: {}, force: true });
      await Transfer.destroy({ where: {}, force: true });
      await Expense.destroy({ where: {}, force: true });
      await Income.destroy({ where: {}, force: true });
      await ExpenseCategory.destroy({ where: {}, force: true });
      await IncomeCategory.destroy({ where: {}, force: true });
      await TransferType.destroy({ where: {}, force: true });
      await Account.destroy({ where: {}, force: true });
      console.log('✓ Datos limpiados\n');
    }

    // Create accounts
    console.log('Creando cuentas...');
    const accounts = [];
    for (const accData of ACCOUNTS_DATA) {
      const [account, created] = await Account.findOrCreate({
        where: { name: accData.name },
        defaults: { ...accData, current_balance: accData.initial_balance, is_active: true }
      });
      accounts.push(account);
      console.log(`  ${created ? '✓ Creada' : '○ Existente'}: ${account.name}`);
    }
    console.log(`  Total: ${accounts.length} cuentas\n`);

    // Create expense categories
    console.log('Creando categorías de egresos...');
    const expenseCategories = [];
    for (const catData of EXPENSE_CATEGORIES_DATA) {
      const [parent, created] = await ExpenseCategory.findOrCreate({
        where: { name: catData.name },
        defaults: { color: catData.color, order_index: expenseCategories.length }
      });
      expenseCategories.push(parent);

      if (catData.subcategories) {
        for (const subData of catData.subcategories) {
          const [sub] = await ExpenseCategory.findOrCreate({
            where: { name: subData.name },
            defaults: { color: subData.color, parent_id: parent.id, order_index: expenseCategories.length }
          });
          expenseCategories.push(sub);
        }
      }
    }
    console.log(`  Total: ${expenseCategories.length} categorías\n`);

    // Create income categories
    console.log('Creando categorías de ingresos...');
    const incomeCategories = [];
    for (const catData of INCOME_CATEGORIES_DATA) {
      const [parent, created] = await IncomeCategory.findOrCreate({
        where: { name: catData.name },
        defaults: { color: catData.color, order_index: incomeCategories.length }
      });
      incomeCategories.push(parent);

      if (catData.subcategories) {
        for (const subData of catData.subcategories) {
          const [sub] = await IncomeCategory.findOrCreate({
            where: { name: subData.name },
            defaults: { color: subData.color, parent_id: parent.id, order_index: incomeCategories.length }
          });
          incomeCategories.push(sub);
        }
      }
    }
    console.log(`  Total: ${incomeCategories.length} categorías\n`);

    // Create transfer types
    console.log('Creando tipos de transferencia...');
    const transferTypes = [];
    for (const typeData of TRANSFER_TYPES_DATA) {
      const [type] = await TransferType.findOrCreate({
        where: { name: typeData.name },
        defaults: typeData
      });
      transferTypes.push(type);
    }
    console.log(`  Total: ${transferTypes.length} tipos\n`);

    // Generate transactions for the past months
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - MONTHS_TO_GENERATE, 1);
    console.log(`Generando transacciones (${MONTHS_TO_GENERATE} meses)...`);
    console.log(`  Período: ${formatDate(startDate)} a ${formatDate(today)}\n`);

    let expenseCount = 0;
    let incomeCount = 0;
    let transferCount = 0;

    // Generate expenses (80-150 per month)
    console.log('  Creando egresos...');
    const leafExpenseCategories = expenseCategories.filter(c =>
      !expenseCategories.some(other => other.parent_id === c.id)
    );

    for (let m = 0; m < MONTHS_TO_GENERATE; m++) {
      const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
      const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + m + 1, 0);
      const numExpenses = randomBetween(80, 150);

      for (let i = 0; i < numExpenses; i++) {
        const category = randomChoice(leafExpenseCategories);
        const account = randomChoice(accounts);
        const descriptions = EXPENSE_DESCRIPTIONS[category.name] || ['Gasto ' + category.name];

        await Expense.create({
          amount: randomBetween(500, 50000),
          category_id: category.id,
          account_id: account.id,
          date: formatDate(randomDate(monthStart, monthEnd)),
          description: randomChoice(descriptions),
          user_id: userId
        });
        expenseCount++;
      }
    }
    console.log(`    ✓ ${expenseCount} egresos creados`);

    // Generate incomes (30-60 per month)
    console.log('  Creando ingresos...');
    const leafIncomeCategories = incomeCategories.filter(c =>
      !incomeCategories.some(other => other.parent_id === c.id)
    );

    for (let m = 0; m < MONTHS_TO_GENERATE; m++) {
      const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
      const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + m + 1, 0);
      const numIncomes = randomBetween(30, 60);

      for (let i = 0; i < numIncomes; i++) {
        const category = randomChoice(leafIncomeCategories);
        const account = randomChoice(accounts);
        const descriptions = INCOME_DESCRIPTIONS[category.name] || ['Ingreso ' + category.name];

        await Income.create({
          amount: randomBetween(1000, 100000),
          category_id: category.id,
          account_id: account.id,
          date: formatDate(randomDate(monthStart, monthEnd)),
          description: randomChoice(descriptions),
          user_id: userId
        });
        incomeCount++;
      }
    }
    console.log(`    ✓ ${incomeCount} ingresos creados`);

    // Generate transfers (5-15 per month)
    console.log('  Creando transferencias...');
    for (let m = 0; m < MONTHS_TO_GENERATE; m++) {
      const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
      const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + m + 1, 0);
      const numTransfers = randomBetween(5, 15);

      for (let i = 0; i < numTransfers; i++) {
        const fromAccount = randomChoice(accounts);
        const toAccount = randomChoice(accounts.filter(a => a.id !== fromAccount.id));
        const transferType = randomChoice(transferTypes);

        await Transfer.create({
          amount: randomBetween(5000, 100000),
          from_account_id: fromAccount.id,
          to_account_id: toAccount.id,
          transfer_type_id: transferType.id,
          date: formatDate(randomDate(monthStart, monthEnd)),
          description: `${transferType.name}: ${fromAccount.name} → ${toAccount.name}`,
          user_id: userId
        });
        transferCount++;
      }
    }
    console.log(`    ✓ ${transferCount} transferencias creadas`);

    // Generate cash reconciliations (2-4 per month for cash accounts)
    console.log('  Creando arqueos de caja...');
    const cashAccounts = accounts.filter(a => a.type === 'cash');
    let reconciliationCount = 0;

    for (let m = 0; m < MONTHS_TO_GENERATE; m++) {
      const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
      const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + m + 1, 0);

      for (const cashAccount of cashAccounts) {
        const numReconciliations = randomBetween(2, 4);
        for (let i = 0; i < numReconciliations; i++) {
          const openingBalance = randomBetween(10000, 80000);
          const closingBalance = openingBalance + randomBetween(-5000, 15000);
          const expectedBalance = closingBalance + randomBetween(-500, 500);
          const difference = closingBalance - expectedBalance;

          await CashReconciliation.create({
            account_id: cashAccount.id,
            date: formatDate(randomDate(monthStart, monthEnd)),
            opening_balance: openingBalance,
            closing_balance: closingBalance,
            expected_balance: expectedBalance,
            notes: difference !== 0 ? 'Diferencia detectada en arqueo' : 'Arqueo correcto',
            user_id: userId
          });
          reconciliationCount++;
        }
      }
    }
    console.log(`    ✓ ${reconciliationCount} arqueos creados`);

    // Summary
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   RESUMEN DE DATOS GENERADOS                     ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║   Cuentas:              ${accounts.length.toString().padStart(5)}                    ║`);
    console.log(`║   Categorías egresos:   ${expenseCategories.length.toString().padStart(5)}                    ║`);
    console.log(`║   Categorías ingresos:  ${incomeCategories.length.toString().padStart(5)}                    ║`);
    console.log(`║   Tipos transferencia:  ${transferTypes.length.toString().padStart(5)}                    ║`);
    console.log(`║   Egresos:              ${expenseCount.toString().padStart(5)}                    ║`);
    console.log(`║   Ingresos:             ${incomeCount.toString().padStart(5)}                    ║`);
    console.log(`║   Transferencias:       ${transferCount.toString().padStart(5)}                    ║`);
    console.log(`║   Arqueos de caja:      ${reconciliationCount.toString().padStart(5)}                    ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('\n✓ Generación completada exitosamente\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error generando datos:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run
generateData();
