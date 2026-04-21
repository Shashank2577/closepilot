import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Database connection singleton
 */
let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Get database connection
 */
export function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL ||
      'postgresql://closepilot:closepilot_dev@localhost:5432/closepilot';

    // Neon (and other cloud Postgres providers) require SSL.
    // postgres.js reads ?sslmode=require from the URL but needs the ssl option
    // set explicitly when running outside of a browser context.
    const requireSsl = connectionString.includes('sslmode=require') ||
      connectionString.includes('neon.tech');

    client = postgres(connectionString, requireSsl ? { ssl: 'require' } : {});
    db = drizzle(client, { schema });
  }

  return db;
}

/**
 * Close database connection
 */
export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}

// Export schema for use in queries
export * from './schema';
