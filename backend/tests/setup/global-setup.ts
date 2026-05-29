import { execSync } from 'child_process';
import { createTestDatabase } from './test-db';

export default async function globalSetup() {
  // Set test database URL before executing anything
  process.env.DATABASE_URL = 'postgresql://postgres:crustys2026@localhost:5433/crustys_express_test';

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
