import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

let promClient: any = null;
try {
  promClient = require('prom-client');
} catch (e) {
  // Soft require
}

export function instrumentedDb(db: PostgresJsDatabase<any>): PostgresJsDatabase<any> {
  const handler: ProxyHandler<any> = {
    get(target, prop, receiver) {
      const origMethod = target[prop];
      if (typeof origMethod === 'function' && ['execute', 'query', 'insert', 'update', 'delete', 'select'].includes(prop as string)) {
        return async function (...args: any[]) {
          const start = Date.now();
          try {
            return await origMethod.apply(target, args);
          } finally {
            const durationMs = Date.now() - start;
            if (durationMs > 500) {
              console.debug(`[DB] Slow query detected (${durationMs}ms):`, prop);
            }
            if (promClient) {
              const registry = promClient.register;
              const metric = registry.getSingleMetric('closepilot_api_db_query_duration_seconds');
              if (metric) {
                metric.observe({ query: prop }, durationMs / 1000);
              }
            }
          }
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  };

  return new Proxy(db, handler);
}
