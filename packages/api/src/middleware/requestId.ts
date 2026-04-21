import { MiddlewareHandler } from 'hono';
import crypto from 'crypto';
import { logger } from '../logger.js';

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  let requestId = c.req.header('x-request-id');

  if (!requestId || requestId.length > 128 || /[^\x20-\x7E]/.test(requestId)) {
    requestId = crypto.randomUUID();
  }

  c.set('requestId', requestId);
  c.set('logger', logger.child({ requestId }));

  c.header('x-request-id', requestId);

  await next();
};
