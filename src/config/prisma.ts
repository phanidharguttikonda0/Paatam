import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  ...(process.env.DATABASE_URL && {
    datasourceUrl: process.env.DATABASE_URL,
  }),
});
