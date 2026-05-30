import { execSync } from 'child_process';
import { createTestDatabase } from './test-db';

import dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  
  const mainDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:ghayensah123@localhost:5432/postgres?schema=public';
  let derivedTestUrl = 'postgresql://postgres:ghayensah123@localhost:5432/crustys_express_test';
  try {
    const urlObj = new URL(mainDbUrl);
    urlObj.pathname = '/crustys_express_test';
    urlObj.search = '';
    derivedTestUrl = urlObj.toString();
  } catch (e) {
    // Fallback
  }
  process.env.DATABASE_URL = derivedTestUrl;

  // 1. Ensure test database exists
  await createTestDatabase();

  // 2. Deploy migrations
  try {
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      stdio: 'pipe', // Hide output unless migration fails
    });
  } catch (error: any) {
    console.error('💥 Failed to run Prisma migrations on test database:', error.message);
    if (error.stdout) {
      console.error(error.stdout.toString());
    }
    throw error;
  }
}
