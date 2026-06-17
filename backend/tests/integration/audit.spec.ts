import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { loginAsAdmin, loginAsCustomer, loginAsManager, generateAccessToken } from '../helpers/auth.helper';
import { createAdmin } from '../helpers/factories';
import { prisma } from '../../src/utils/prisma';

// Helper to log in as a standard Admin with specific permissions
async function loginAsStandardAdmin() {
  const admin = await createAdmin();
  const token = generateAccessToken({
    adminId: admin.id,
    email: admin.email,
    role: 'Admin',
    permissions: [
      'read:auditlogs',
      'export:auditlogs',
    ],
  });
  return { token, admin };
}

describe('Audit Logs Integration Tests', () => {
  let superAdminToken: string;
  let adminToken: string;
  let managerToken: string;
  let customerToken: string;

  beforeAll(async () => {
    await seedTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestDatabase();

    const superAdminSession = await loginAsAdmin();
    superAdminToken = superAdminSession.token;

    const adminSession = await loginAsStandardAdmin();
    adminToken = adminSession.token;

    const managerSession = await loginAsManager();
    managerToken = managerSession.token;

    const customerSession = await loginAsCustomer();
    customerToken = customerSession.token;

    // Seed test logs directly in DB
    await prisma.activityLog.createMany({
      data: [
        {
          userId: 'usr_001',
          userEmail: 'user1@test.com',
          role: 'CUSTOMER',
          action: 'auth_login',
          entity: 'User',
          entityId: 'usr_001',
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome',
        },
        {
          userId: 'adm_001',
          userEmail: 'admin@test.com',
          role: 'ADMIN',
          action: 'product_create',
          entity: 'Product',
          entityId: 'prod_001',
          newValue: { name: 'Super Pizza', price: 15.99 },
          ipAddress: '192.168.1.2',
          userAgent: 'Firefox',
        },
        {
          userId: 'adm_001',
          userEmail: 'admin@test.com',
          role: 'ADMIN',
          action: 'product_update',
          entity: 'Product',
          entityId: 'prod_001',
          oldValue: { name: 'Super Pizza', price: 15.99 },
          newValue: { name: 'Super Pizza', price: 17.99 },
          ipAddress: '192.168.1.2',
          userAgent: 'Firefox',
        },
      ],
    });
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('GET /api/v1/audit-logs', () => {
    it('should retrieve list of audit logs for Super Admin', async () => {
      const res = await authRequest(superAdminToken)
        .get('/api/v1/audit-logs')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.logs).toBeDefined();
      expect(res.body.data.logs.length).toBe(3);
    });

    it('should retrieve list of audit logs for standard Admin with read permission', async () => {
      const res = await authRequest(adminToken)
        .get('/api/v1/audit-logs')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.logs.length).toBe(3);
    });

    it('should support pagination (limit/page)', async () => {
      const res = await authRequest(adminToken)
        .get('/api/v1/audit-logs?page=1&limit=2')
        .expect(200);

      expect(res.body.data.logs.length).toBe(2);
      expect(res.body.data.pagination.total).toBe(3);
      expect(res.body.data.pagination.totalPages).toBe(2);
    });

    it('should filter by action', async () => {
      const res = await authRequest(adminToken)
        .get('/api/v1/audit-logs?action=auth_login')
        .expect(200);

      expect(res.body.data.logs.length).toBe(1);
      expect(res.body.data.logs[0].action).toBe('auth_login');
    });

    it('should filter by entity', async () => {
      const res = await authRequest(adminToken)
        .get('/api/v1/audit-logs?entity=Product')
        .expect(200);

      expect(res.body.data.logs.length).toBe(2);
    });

    it('should search query text', async () => {
      const res = await authRequest(adminToken)
        .get('/api/v1/audit-logs?search=Firefox')
        .expect(200);

      expect(res.body.data.logs.length).toBe(2);
      expect(res.body.data.logs[0].userEmail).toBe('admin@test.com');
    });

    it('should deny access to Manager role', async () => {
      await authRequest(managerToken)
        .get('/api/v1/audit-logs')
        .expect(403);
    });

    it('should deny access to Customer role', async () => {
      await authRequest(customerToken)
        .get('/api/v1/audit-logs')
        .expect(403);
    });

    it('should deny access to unauthenticated requests', async () => {
      await request
        .get('/api/v1/audit-logs')
        .expect(401);
    });
  });

  describe('GET /api/v1/audit-logs/:id', () => {
    it('should retrieve a specific audit log by its ID', async () => {
      const logs = await prisma.activityLog.findMany();
      const targetLog = logs[0];

      const res = await authRequest(adminToken)
        .get(`/api/v1/audit-logs/${targetLog.id}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(targetLog.id);
      expect(res.body.data.action).toBe(targetLog.action);
    });

    it('should return 404 for non-existent ID', async () => {
      await authRequest(adminToken)
        .get('/api/v1/audit-logs/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should deny access for non-admin accounts', async () => {
      const logs = await prisma.activityLog.findMany();
      await authRequest(customerToken)
        .get(`/api/v1/audit-logs/${logs[0].id}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/audit-logs/export', () => {
    it('should export audit logs in JSON format', async () => {
      const res = await authRequest(adminToken)
        .get('/api/v1/audit-logs/export?format=json')
        .expect(200);

      expect(res.headers['content-type']).toContain('application/json');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('should export audit logs in CSV format', async () => {
      const res = await authRequest(adminToken)
        .get('/api/v1/audit-logs/export?format=csv')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('ID,User ID,Email,Role,Action,Entity,Entity ID,Old Value,New Value,IP Address,User Agent,Created At');
      expect(res.text).toContain('auth_login');
      expect(res.text).toContain('product_create');
    });

    it('should export audit logs in XLSX format', async () => {
      const res = await authRequest(adminToken)
        .get('/api/v1/audit-logs/export?format=xlsx')
        .expect(200);

      expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.body).toBeDefined();
    });

    it('should filter export data by action', async () => {
      const res = await authRequest(adminToken)
        .get('/api/v1/audit-logs/export?format=json&action=product_create')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].action).toBe('product_create');
    });

    it('should deny export to Manager role', async () => {
      await authRequest(managerToken)
        .get('/api/v1/audit-logs/export?format=csv')
        .expect(403);
    });
  });
});
