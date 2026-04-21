import { MiddlewareHandler } from 'hono';
import { requestsTotalCounter, requestDurationHistogram } from '../metrics.js';

export const metricsMiddleware: MiddlewareHandler = async (c, next) => {
  const start = process.hrtime.bigint();

  await next();

  const end = process.hrtime.bigint();
  // Duration in seconds
  const duration = Number(end - start) / 1e9;

  // Try to find a matched route, otherwise fallback to path
  const route = c.req.routePath || c.req.path;
  const method = c.req.method;
  const status = c.res.status.toString();

  requestsTotalCounter.inc({ method, route, status });
  requestDurationHistogram.observe({ method, route, status }, duration);
};
