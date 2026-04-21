import { Context, Next } from 'hono';
import { logger } from '../logger.js';

/**
 * Middleware to add a unique request ID to each request
 */
export async function requestIdMiddleware(c: Context, next: Next) {
  const incomingId = c.req.header('x-request-id');
  
  // UUID v4 format regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // Use incoming ID if it exists and is a valid UUID, otherwise generate new one
  let requestId = (incomingId && uuidRegex.test(incomingId)) ? incomingId : null;

  if (!requestId) {
    try {
      requestId = globalThis.crypto?.randomUUID();
    } catch (e) {
      // Fallback for older Node versions or environments without global crypto
      const { randomUUID } = await import('node:crypto');
      requestId = randomUUID();
    }
  }

  // Fallback if everything fails
  if (!requestId) {
    requestId = Math.random().toString(36).substring(2, 15);
  }

  // Store in context
  c.set('requestId', requestId);
  
  // Add to response headers
  c.header('x-request-id', requestId);

  // Create a request-scoped logger
  const requestLogger = {
    debug: (fields: any, msg: string) => logger.debug({ ...fields, requestId }, msg),
    info: (fields: any, msg: string) => logger.info({ ...fields, requestId }, msg),
    warn: (fields: any, msg: string) => logger.warn({ ...fields, requestId }, msg),
    error: (fields: any, msg: string) => logger.error({ ...fields, requestId }, msg),
  };
  
  c.set('logger', requestLogger);

  await next();
}
