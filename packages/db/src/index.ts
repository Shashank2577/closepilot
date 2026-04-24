// Database connection
export * from './db';

// Schema definitions
export * from './schema';

// Query stubs
export * from './queries';

// Re-export Drizzle helpers so workspace packages use the same Drizzle instance.
export { eq, desc, and, gte, lte, or, ilike, sql } from 'drizzle-orm';

// Redis cache utilities
export { getCache, setCache, deleteCache } from './redis.js';
export { default as redisClient } from './redis.js';

// OpenTelemetry instrumentation
export * from './instrument.js';
