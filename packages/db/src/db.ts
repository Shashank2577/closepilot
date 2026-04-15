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

    client = postgres(connectionString);
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
