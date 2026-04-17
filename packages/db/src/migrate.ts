import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exitCode = 1;
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    const db = drizzle(client);

    // Check migrations applied before
    let appliedCount = 0;
    try {
      const res = await client.query('SELECT count(*) as count FROM "__drizzle_migrations"');
      appliedCount = parseInt(res.rows[0].count, 10);
    } catch (e) {
      // Table doesn't exist yet, meaning 0 applied
    }

    console.log('Running migrations...');
    const migrationsFolder = path.join(__dirname, '..', 'drizzle');
    await migrate(db, { migrationsFolder });

    // Check migrations applied after
    const resAfter = await client.query('SELECT count(*) as count FROM "__drizzle_migrations"');
    const newCount = parseInt(resAfter.rows[0].count, 10);

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
