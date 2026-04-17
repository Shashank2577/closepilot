import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

export const metricsRegistry = new Registry();

// Collect default metrics
collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'closepilot_api_',
});

// Counters
export const requestsTotalCounter = new Counter({
  name: 'closepilot_api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
});

export const dealsCreatedCounter = new Counter({
  name: 'closepilot_api_deals_created_total',
  help: 'Total number of deals created',
  registers: [metricsRegistry],
});

export const approvalsResolvedCounter = new Counter({
  name: 'closepilot_api_approvals_resolved_total',
  help: 'Total number of approvals resolved',
  labelNames: ['decision'],
  registers: [metricsRegistry],
});

// Histograms
export const requestDurationHistogram = new Histogram({
  name: 'closepilot_api_request_duration_seconds',
  help: 'API request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

export const dbQueryDurationHistogram = new Histogram({
  name: 'closepilot_api_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query'],
  registers: [metricsRegistry],
});
