import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as path from 'path';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exitCode = 1;
    return;
  }

  const requireSsl = databaseUrl.includes('sslmode=require') || databaseUrl.includes('neon.tech');
  const client = postgres(databaseUrl, { max: 1, ...(requireSsl ? { ssl: 'require' } : {}) });
  const db = drizzle(client);

  try {
    console.log('Running migrations...');
    const migrationsFolder = path.join(__dirname, '..', 'drizzle');
    await migrate(db, { migrationsFolder });
    console.log('Migrations applied successfully!');
    process.exitCode = 0;
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
