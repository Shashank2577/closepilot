import { cors } from 'hono/cors';

/**
 * CORS middleware configuration
 */
export const corsMiddleware = cors({
  origin: ['http://localhost:3002', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

export { cors as cors };
