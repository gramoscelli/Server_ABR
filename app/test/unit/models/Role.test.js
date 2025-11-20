/**
 * Role Model Unit Tests
 * Tests the Role model with ACL permissions
 */

const { Role } = require('../../../models');
const { sequelize } = require('../../../config/database');

describe('Role Model', () => {
  beforeAll(async () => {
    // Ensure database connection is established
    await sequelize.authenticate();
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  describe('Role Creation and Retrieval', () => {
    test('should find all four roles', async () => {
      const roles = await Role.findAll();
      expect(roles).toHaveLength(4);

      const roleNames = roles.map(r => r.name).sort();
      expect(roleNames).toEqual(['admin', 'printer', 'readonly', 'user']);
    });

    test('should find role by name', async () => {
      const adminRole = await Role.findByName('admin');
      expect(adminRole).toBeDefined();
      expect(adminRole.name).toBe('admin');
      expect(adminRole.is_system).toBe(true);
    });

    test('should find printer role', async () => {
      const printerRole = await Role.findByName('printer');
      expect(printerRole).toBeDefined();
      expect(printerRole.name).toBe('printer');
      expect(printerRole.is_system).toBe(false);
    });

    test('should get role ID by name', async () => {
      const adminId = await Role.getIdByName('admin');
      expect(adminId).toBeDefined();
      expect(typeof adminId).toBe('number');
      expect(adminId).toBe(1); // Admin should be ID 1
    });

    test('should validate role names', () => {
      expect(Role.isValidRole('admin')).toBe(true);
      expect(Role.isValidRole('user')).toBe(true);
      expect(Role.isValidRole('readonly')).toBe(true);
      expect(Role.isValidRole('printer')).toBe(true);
      expect(Role.isValidRole('invalid')).toBe(false);
    });
  });

  describe('Admin Role - Wildcard Permissions', () => {
    let adminRole;

    beforeAll(async () => {
      adminRole = await Role.findByName('admin');
    });

    test('admin role should be system protected', () => {
      expect(adminRole.is_system).toBe(true);
    });

    test('admin role should have wildcard permission', () => {
      expect(adminRole.permissions).toBeDefined();
      expect(adminRole.permissions['*']).toBeDefined();
      expect(adminRole.permissions['*']).toContain('*');
    });

    test('admin should have permission for any resource and action', () => {
      // Test various resources
      expect(adminRole.hasPermission('users', 'create')).toBe(true);
      expect(adminRole.hasPermission('users', 'delete')).toBe(true);
      expect(adminRole.hasPermission('tirada', 'read')).toBe(true);
      expect(adminRole.hasPermission('tirada', 'print')).toBe(true);
      expect(adminRole.hasPermission('api_keys', 'create')).toBe(true);
      expect(adminRole.hasPermission('anything', 'anything')).toBe(true);
    });

    test('admin can access any resource', () => {
      expect(adminRole.canAccessResource('users')).toBe(true);
      expect(adminRole.canAccessResource('tirada')).toBe(true);
      expect(adminRole.canAccessResource('nonexistent')).toBe(true);
    });
  });

  describe('Printer Role - Limited Permissions', () => {
    let printerRole;

    beforeAll(async () => {
      printerRole = await Role.findByName('printer');
    });

    test('printer role should not be system protected', () => {
      expect(printerRole.is_system).toBe(false);
    });

    test('printer role should have limited permissions', () => {
      expect(printerRole.permissions).toBeDefined();
      expect(printerRole.permissions.tirada).toContain('read');
      expect(printerRole.permissions.tirada).toContain('print');
      expect(printerRole.permissions.socios).toContain('read');
      expect(printerRole.permissions.cobrocuotas).toContain('read');
    });

    test('printer CAN read and print tirada', () => {
      expect(printerRole.hasPermission('tirada', 'read')).toBe(true);
      expect(printerRole.hasPermission('tirada', 'print')).toBe(true);
    });

    test('printer CAN read socios and cobrocuotas', () => {
      expect(printerRole.hasPermission('socios', 'read')).toBe(true);
      expect(printerRole.hasPermission('cobrocuotas', 'read')).toBe(true);
    });

    test('printer CANNOT modify tirada', () => {
      expect(printerRole.hasPermission('tirada', 'create')).toBe(false);
      expect(printerRole.hasPermission('tirada', 'update')).toBe(false);
      expect(printerRole.hasPermission('tirada', 'delete')).toBe(false);
    });

    test('printer CANNOT access users or roles', () => {
      expect(printerRole.hasPermission('users', 'read')).toBe(false);
      expect(printerRole.hasPermission('users', 'create')).toBe(false);
      expect(printerRole.hasPermission('roles', 'read')).toBe(false);
      expect(printerRole.hasPermission('api_keys', 'read')).toBe(false);
    });

    test('printer can access tirada resource', () => {
      expect(printerRole.canAccessResource('tirada')).toBe(true);
    });

    test('printer cannot access users resource', () => {
      expect(printerRole.canAccessResource('users')).toBe(false);
    });

    test('printer has correct resource permissions', () => {
      const tiradaPerms = printerRole.getResourcePermissions('tirada');
      expect(tiradaPerms).toEqual(expect.arrayContaining(['read', 'print']));

      const usersPerms = printerRole.getResourcePermissions('users');
      expect(usersPerms).toEqual([]);
    });
  });

  describe('User Role - Standard Permissions', () => {
    let userRole;

    beforeAll(async () => {
      userRole = await Role.findByName('user');
    });

    test('user role should not be system protected', () => {
      expect(userRole.is_system).toBe(false);
    });

    test('user CAN read and print tirada', () => {
      expect(userRole.hasPermission('tirada', 'read')).toBe(true);
      expect(userRole.hasPermission('tirada', 'print')).toBe(true);
    });

    test('user CAN read and update socios', () => {
      expect(userRole.hasPermission('socios', 'read')).toBe(true);
      expect(userRole.hasPermission('socios', 'update')).toBe(true);
    });

    test('user CANNOT delete socios', () => {
      expect(userRole.hasPermission('socios', 'delete')).toBe(false);
      expect(userRole.hasPermission('socios', 'create')).toBe(false);
    });

    test('user CAN read users but cannot modify', () => {
      expect(userRole.hasPermission('users', 'read')).toBe(true);
      expect(userRole.hasPermission('users', 'create')).toBe(false);
      expect(userRole.hasPermission('users', 'update')).toBe(false);
      expect(userRole.hasPermission('users', 'delete')).toBe(false);
    });
  });

  describe('Readonly Role - Read-Only Permissions', () => {
    let readonlyRole;

    beforeAll(async () => {
      readonlyRole = await Role.findByName('readonly');
    });

    test('readonly role should not be system protected', () => {
      expect(readonlyRole.is_system).toBe(false);
    });

    test('readonly CAN read tirada but NOT print', () => {
      expect(readonlyRole.hasPermission('tirada', 'read')).toBe(true);
      expect(readonlyRole.hasPermission('tirada', 'print')).toBe(false);
    });

    test('readonly CAN read socios but NOT modify', () => {
      expect(readonlyRole.hasPermission('socios', 'read')).toBe(true);
      expect(readonlyRole.hasPermission('socios', 'create')).toBe(false);
      expect(readonlyRole.hasPermission('socios', 'update')).toBe(false);
      expect(readonlyRole.hasPermission('socios', 'delete')).toBe(false);
    });

    test('readonly CANNOT access api_keys', () => {
      expect(readonlyRole.hasPermission('api_keys', 'read')).toBe(false);
      expect(readonlyRole.canAccessResource('api_keys')).toBe(false);
    });
  });

  describe('ACL Permission Methods', () => {
    let printerRole;

    beforeAll(async () => {
      printerRole = await Role.findByName('printer');
    });

    test('hasPermission should return false for undefined permissions', () => {
      expect(printerRole.hasPermission('nonexistent', 'action')).toBe(false);
    });

    test('getResourcePermissions should return empty array for undefined resource', () => {
      const perms = printerRole.getResourcePermissions('nonexistent');
      expect(perms).toEqual([]);
    });

    test('canAccessResource should return false for undefined resource', () => {
      expect(printerRole.canAccessResource('nonexistent')).toBe(false);
    });

    test('hasPermission should handle null permissions gracefully', async () => {
      // Create a mock role with null permissions
      const mockRole = { permissions: null };
      const result = Role.prototype.hasPermission.call(mockRole, 'test', 'read');
      expect(result).toBe(false);
    });
  });

  describe('Role Comparison', () => {
    let adminRole, userRole, printerRole, readonlyRole;

    beforeAll(async () => {
      adminRole = await Role.findByName('admin');
      userRole = await Role.findByName('user');
      printerRole = await Role.findByName('printer');
      readonlyRole = await Role.findByName('readonly');
    });

    test('admin has more permissions than all other roles', () => {
      // Admin can do everything others can do
      expect(adminRole.hasPermission('tirada', 'read')).toBe(true);
      expect(adminRole.hasPermission('users', 'create')).toBe(true);

      // But others cannot do what admin can
      expect(userRole.hasPermission('users', 'delete')).toBe(false);
      expect(printerRole.hasPermission('users', 'delete')).toBe(false);
      expect(readonlyRole.hasPermission('users', 'delete')).toBe(false);
    });

    test('printer has fewer permissions than user', () => {
      // User can update socios, printer cannot
      expect(userRole.hasPermission('socios', 'update')).toBe(true);
      expect(printerRole.hasPermission('socios', 'update')).toBe(false);

      // User can read users, printer cannot
      expect(userRole.hasPermission('users', 'read')).toBe(true);
      expect(printerRole.hasPermission('users', 'read')).toBe(false);
    });

    test('readonly has least permissions', () => {
      // Readonly cannot print, others can
      expect(readonlyRole.hasPermission('tirada', 'print')).toBe(false);
      expect(printerRole.hasPermission('tirada', 'print')).toBe(true);
      expect(userRole.hasPermission('tirada', 'print')).toBe(true);

      // Readonly cannot access api_keys
      expect(readonlyRole.canAccessResource('api_keys')).toBe(false);
    });
  });
});
