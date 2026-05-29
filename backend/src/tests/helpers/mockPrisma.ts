import { prisma } from '../../utils/prisma';

/**
 * Centered Prisma Mock Accessor
 * Since Prisma is mocked globally in jest.setup.ts, importing 'prisma'
 * from 'utils/prisma' already yields the mocked client.
 * This helper provides a strongly typed reference to the mocked Prisma client.
 */
export const prismaMock = prisma as any;
export type MockPrismaType = typeof prismaMock;
