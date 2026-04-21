import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

/**
 * Prometheus metrics registry
 */
export const registry = new Registry();

// Add default metrics (CPU, Memory, etc.)
collectDefaultMetrics({
  register: registry,
  prefix: 'closepilot_api_',
});

/**
 * Total requests counter
 */
export const httpRequestsTotal = new Counter({
  name: 'closepilot_api_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

/**
 * Request duration histogram
 */
export const httpRequestDurationSeconds = new Histogram({
  name: 'closepilot_api_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

/**
 * Deals created counter
 */
export const dealsCreatedTotal = new Counter({
  name: 'closepilot_api_deals_created_total',
  help: 'Total number of deals created',
  registers: [registry],
});

/**
 * Approvals resolved counter
 */
export const approvalsResolvedTotal = new Counter({
  name: 'closepilot_api_approvals_resolved_total',
  help: 'Total number of approvals resolved',
  labelNames: ['decision'],
  registers: [registry],
});

/**
 * DB query duration histogram
 */
export const dbQueryDurationSeconds = new Histogram({
  name: 'closepilot_api_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query'],
  registers: [registry],
});
