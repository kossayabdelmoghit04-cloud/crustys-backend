import { seedTestDatabase } from './prisma.helper';

export { seedTestDatabase };
export async function seedInitialData() {
  return seedTestDatabase();
}
