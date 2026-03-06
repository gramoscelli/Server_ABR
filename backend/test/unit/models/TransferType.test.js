/**
 * TransferType Model Unit Tests
 * Tests for the TransferType model including is_active field
 */

const { TransferType } = require('../../../models/accounting');
const { accountingDb } = require('../../../config/database');

describe('TransferType Model', () => {
  beforeAll(async () => {
    await accountingDb.authenticate();
    await accountingDb.sync({ force: true });
  });

  afterAll(async () => {
    await accountingDb.close();
  });

  beforeEach(async () => {
    await TransferType.destroy({ where: {}, force: true });
  });

  describe('Creation', () => {
    test('should create a transfer type with default values', async () => {
      const type = await TransferType.create({ name: 'Transferencia' });

      expect(type.id).toBeDefined();
      expect(type.name).toBe('Transferencia');
      expect(type.color).toBe('#3B82F6');
      expect(type.is_active).toBe(true);
      expect(type.order_index).toBe(0);
      expect(type.description).toBeFalsy();
    });

    test('should create a transfer type with is_active=false', async () => {
      const type = await TransferType.create({
        name: 'Inactivo',
        is_active: false,
      });

      expect(type.is_active).toBe(false);
    });

    test('should create a transfer type with all fields', async () => {
      const type = await TransferType.create({
        name: 'Depósito',
        color: '#00FF00',
        description: 'Depósito de efectivo',
        order_index: 2,
        is_active: true,
      });

      expect(type.name).toBe('Depósito');
      expect(type.color).toBe('#00FF00');
      expect(type.description).toBe('Depósito de efectivo');
      expect(type.order_index).toBe(2);
      expect(type.is_active).toBe(true);
    });

    test('should reject creation without name', async () => {
      await expect(
        TransferType.create({ description: 'Sin nombre' })
      ).rejects.toThrow();
    });

    test('should reject invalid color format', async () => {
      await expect(
        TransferType.create({ name: 'Test', color: 'red' })
      ).rejects.toThrow();
    });
  });

  describe('Update', () => {
    test('should update is_active field', async () => {
      const type = await TransferType.create({ name: 'Test' });
      expect(type.is_active).toBe(true);

      type.is_active = false;
      await type.save();

      const updated = await TransferType.findByPk(type.id);
      expect(updated.is_active).toBe(false);
    });

    test('should update name and description', async () => {
      const type = await TransferType.create({ name: 'Original' });

      type.name = 'Extracción';
      type.description = 'Extracción de banco a caja';
      await type.save();

      const updated = await TransferType.findByPk(type.id);
      expect(updated.name).toBe('Extracción');
      expect(updated.description).toBe('Extracción de banco a caja');
    });
  });

  describe('Ordering', () => {
    test('should retrieve types ordered by order_index', async () => {
      await TransferType.create({ name: 'Tercero', order_index: 3 });
      await TransferType.create({ name: 'Primero', order_index: 1 });
      await TransferType.create({ name: 'Segundo', order_index: 2 });

      const types = await TransferType.findAll({
        order: [['order_index', 'ASC'], ['name', 'ASC']],
      });

      expect(types[0].name).toBe('Primero');
      expect(types[1].name).toBe('Segundo');
      expect(types[2].name).toBe('Tercero');
    });
  });
});
