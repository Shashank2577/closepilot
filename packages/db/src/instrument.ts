import { Histogram, register } from 'prom-client';

/**
 * DB query duration histogram
 * We use the same name as in the API service
 */
const dbQueryDurationSeconds = new Histogram({
  name: 'closepilot_api_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query'],
});

/**
 * Instruments a Drizzle client to record query metrics
 */
export function instrumentDb<T extends object>(db: T): T {
  return new Proxy(db, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original === 'function' && ['execute', 'query', 'insert', 'update', 'delete', 'select'].includes(prop as string)) {
        return (...args: any[]) => {
          const start = performance.now();
          const queryName = prop as string;

          try {
            const result = original.apply(target, args);

            if (result instanceof Promise) {
              return result.finally(() => {
                const duration = (performance.now() - start) / 1000;
                dbQueryDurationSeconds.observe({ query: queryName }, duration);
                
                if (duration > 0.5) {
                  console.debug(`[DB] Slow query: ${queryName} took ${duration.toFixed(3)}s`);
                }
              });
            }

            const duration = (performance.now() - start) / 1000;
            dbQueryDurationSeconds.observe({ query: queryName }, duration);
            return result;
          } catch (error) {
            const duration = (performance.now() - start) / 1000;
            dbQueryDurationSeconds.observe({ query: queryName }, duration);
            throw error;
          }
        };
      }

      return original;
    },
  });
}
