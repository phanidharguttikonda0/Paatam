import { execSync } from 'child_process';
import { prisma } from '../config/prisma';
import { beforeAll, afterAll, beforeEach } from 'vitest';

const containerName = 'paatam_test_db_18';
const port = 5489;

beforeAll(async () => {
  // 1. Clean up any previous dangling container
  try { execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' }); } catch (e) {}

  // 2. Spin up Postgres using raw docker command (Testcontainers bug workaround)
  console.log('Starting Postgres container...');
  execSync(`docker run --name ${containerName} -d -p ${port}:5432 -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=testdb postgres:17-alpine`);
  
  // Wait 15 seconds for Postgres to be ready
  await new Promise(res => setTimeout(res, 15000));
  
  // 3. Overwrite DATABASE_URL
  process.env.DATABASE_URL = `postgresql://test:test@localhost:${port}/testdb?schema=public`;

  // 4. Push Prisma schema
  console.log('Pushing Prisma schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });
});

afterAll(async () => {
  await prisma.$disconnect();
  // 5. Kill and remove the container
  try { execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' }); } catch (e) {}
});

// Clean up the database before all tests run, not between each test, 
// because our integration tests are written as a sequential flow.
beforeAll(async () => {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
      } catch (error) {}
    }
  }
});
