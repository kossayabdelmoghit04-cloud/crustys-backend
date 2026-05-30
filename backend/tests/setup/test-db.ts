import { PrismaClient } from '@prisma/client';

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const mainDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:ghayensah123@localhost:5432/postgres?schema=public';
let derivedDefaultUrl = 'postgresql://postgres:ghayensah123@localhost:5432/postgres';
try {
  const urlObj = new URL(mainDbUrl);
  urlObj.pathname = '/postgres';
  urlObj.search = '';
  derivedDefaultUrl = urlObj.toString();
} catch (e) {
  // Fallback
}

const POSTGRES_DEFAULT_URL = derivedDefaultUrl;

export async function createTestDatabase() {
  const adminClient = new PrismaClient({
    datasources: {
      db: {
        url: POSTGRES_DEFAULT_URL,
      },
    },
  });

  try {
    // Check if the database already exists
    const result = await adminClient.$queryRawUnsafe<{ exists: boolean }[]>(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = 'crustys_express_test')"
    );

    const exists = result[0]?.exists;

    if (!exists) {
      // Create database
      await adminClient.$executeRawUnsafe('CREATE DATABASE crustys_express_test');
    }
  } catch (error: any) {
    // If it's code 42P04 (duplicate_database), we can ignore it
    if (!error.message?.includes('42P04') && !error.message?.includes('already exists')) {
      throw error;
    }
  } finally {
    await adminClient.$disconnect();
  }
}

export async function dropTestDatabase() {
  const adminClient = new PrismaClient({
    datasources: {
      db: {
        url: POSTGRES_DEFAULT_URL,
      },
    },
  });

  try {
    // Terminate active connections to the test database first to avoid drop errors
    await adminClient.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'crustys_express_test'
        AND pid <> pg_backend_pid();
    `);

    await adminClient.$executeRawUnsafe('DROP DATABASE IF EXISTS crustys_express_test');
  } catch (error) {
    // Ignore errors during teardown drop
  } finally {
    await adminClient.$disconnect();
  }
}
