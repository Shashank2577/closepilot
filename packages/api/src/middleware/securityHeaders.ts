import { Context, Next } from 'hono';
import { loadApiEnv } from '@closepilot/core';

const env = loadApiEnv();

/**
 * Middleware to add security headers to responses
 */
export async function securityHeadersMiddleware(c: Context, next: Next) {
  await next();
  
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Basic CSP - the web app will have its own more detailed CSP
  c.header('Content-Security-Policy', "default-src 'self'");
}
