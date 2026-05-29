import { prisma } from '../../src/utils/prisma';
import bcrypt from 'bcryptjs';

export async function cleanDatabase() {
  const tableNames = [
    'activity_logs',
    'admins',
    'roles',
    'order_items',
    'payments',
    'orders',
    'reservations',
    'product_images',
    'products',
    'categories',
    'users',
    'Testimonial',
    'contacts',
    'gallery',
    'site_contents',
    'media_metadata',
    'upload_sessions',
    'upload_versions',
    'failed_uploads',
    'media_processing_logs',
  ];

  try {
    for (const tableName of tableNames) {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`
      );
    }
  } catch (error) {
    console.error('Error cleaning database:', error);
    throw error;
  }
}

export async function seedTestDatabase() {
  const hashedPassword = bcrypt.hashSync('Admin123!', 10);

  // 1. Seed Roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: { permissions: ['*'] },
    create: {
      name: 'Super Admin',
      permissions: ['*'],
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {
      permissions: [
        'read:admins',
        'write:admins',
        'read:products',
        'write:products',
        'read:categories',
        'write:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'write:payments',
        'read:analytics',
      ],
    },
    create: {
      name: 'Admin',
      permissions: [
        'read:admins',
        'write:admins',
        'read:products',
        'write:products',
        'read:categories',
        'write:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'write:payments',
        'read:analytics',
      ],
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {
      permissions: [
        'read:products',
        'read:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'read:analytics',
      ],
    },
    create: {
      name: 'Manager',
      permissions: [
        'read:products',
        'read:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'read:analytics',
      ],
    },
  });

  return {
    superAdminRole,
    adminRole,
    managerRole,
  };
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
