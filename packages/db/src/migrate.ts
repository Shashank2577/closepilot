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
    // Check migrations applied before
    let appliedCount = 0;
    try {
      const res = await client`SELECT count(*) as count FROM "__drizzle_migrations"`;
      appliedCount = parseInt((res[0] as any).count, 10);
    } catch (e) {
      // Table doesn't exist yet, meaning 0 applied
    }

    console.log('Running migrations...');
    const migrationsFolder = path.join(__dirname, '..', 'drizzle');
    await migrate(db, { migrationsFolder });

    // Check migrations applied after
    const resAfter = await client`SELECT count(*) as count FROM "__drizzle_migrations"`;
    const newCount = parseInt((resAfter[0] as any).count, 10);

    const diff = newCount - appliedCount;
    if (diff === 0) {
      console.log('no pending migrations');
    } else {
      console.log(`Migrations applied successfully! Applied ${diff} migrations.`);
    }

    process.exitCode = 0;
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
