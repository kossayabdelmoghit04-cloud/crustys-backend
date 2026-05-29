import { dropTestDatabase } from './test-db';

export default async function globalTeardown() {
  await dropTestDatabase();
}
