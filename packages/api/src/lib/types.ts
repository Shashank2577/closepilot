import { Context } from 'hono';

/**
 * Request-scoped logger interface
 */
export interface RequestLogger {
  debug: (fields: any, msg: string) => void;
  info: (fields: any, msg: string) => void;
  warn: (fields: any, msg: string) => void;
  error: (fields: any, msg: string) => void;
}

/**
 * Hono Application Environment Variables
 */
export type AppEnv = {
  Variables: {
    requestId: string;
    logger: RequestLogger;
  };
};

/**
 * Type-safe Hono context
 */
export type AppContext = Context<AppEnv>;
