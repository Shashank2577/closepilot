import { Context, Next } from 'hono';
import { loadApiEnv } from '@closepilot/core';

const env = loadApiEnv();

/**
 * Middleware to enforce request body size limits
 */
export async function bodyLimitMiddleware(c: Context, next: Next) {
  if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
    const contentLength = c.req.header('content-length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const limitInBytes = env.REQUEST_BODY_LIMIT_KB * 1024;
      
      if (sizeInBytes > limitInBytes) {
        return c.json({ 
          error: 'payload_too_large', 
          message: `Request body exceeds limit of ${env.REQUEST_BODY_LIMIT_KB}KB` 
        }, 413);
      }
    }
  }
  
  await next();
}
