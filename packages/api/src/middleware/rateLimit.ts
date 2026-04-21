import { Context, Next } from 'hono';
import { logger } from '../logger.js';
import { loadApiEnv } from '@closepilot/core';

const env = loadApiEnv();

/**
 * In-memory token bucket rate limiter
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per ms

  constructor(rpm: number, burst: number) {
    this.capacity = burst;
    this.tokens = burst;
    this.lastRefill = Date.now();
    this.refillRate = rpm / (60 * 1000);
  }

  tryConsume(): { success: boolean; waitMs: number } {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return { success: true, waitMs: 0 };
    }

    const waitMs = (1 - this.tokens) / this.refillRate;
    return { success: false, waitMs };
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

const buckets = new Map<string, TokenBucket>();

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
  // Skip health and metrics
  if (c.req.path === '/api/health' || c.req.path === '/metrics') {
    return next();
  }

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 
             (c.env as any)?.incoming?.socket?.remoteAddress || 
             'unknown';
  
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = new TokenBucket(env.RATE_LIMIT_RPM, env.RATE_LIMIT_BURST);
    buckets.set(ip, bucket);
  }

  const { success, waitMs } = bucket.tryConsume();

  if (!success) {
    const retryAfter = Math.ceil(waitMs / 1000);
    logger.warn({ ip, path: c.req.path, retryAfter }, 'rate limit exceeded');
    
    c.header('Retry-After', retryAfter.toString());
    return c.json({ error: 'rate_limit_exceeded', message: 'Too many requests' }, 429);
  }

  await next();
}
