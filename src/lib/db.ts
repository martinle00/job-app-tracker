import { PrismaClient } from '@prisma/client';

// Next's dev server re-evaluates modules on every hot reload; without this the
// process accumulates connections until SQLite starts refusing them.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
