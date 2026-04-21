import { z } from 'zod';

/**
 * Common environment schemas
 */
const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']).default('info');
const NodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');

/**
 * API Service Environment Schema
 */
export const ApiEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: NodeEnvSchema,
  LOG_LEVEL: LogLevelSchema,
  ANTHROPIC_API_KEY: z.string().min(10),
  OTEL_ENABLED: z.coerce.boolean().default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  METRICS_BEARER_TOKEN: z.string().min(16).optional(),
  RATE_LIMIT_RPM: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_BURST: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().transform(s => s.split(',').map(x => x.trim()).filter(Boolean)).default('http://localhost:3000'),
  REQUEST_BODY_LIMIT_KB: z.coerce.number().int().positive().default(256),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
});

/**
 * MCP Server Environment Schema
 */
export const McpEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  MCP_PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: NodeEnvSchema,
  LOG_LEVEL: LogLevelSchema,
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  ANTHROPIC_API_KEY: z.string().min(10),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_ACCESS_TOKEN: z.string().min(1).optional(),
  GOOGLE_REFRESH_TOKEN: z.string().min(1).optional(),
  GMAIL_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_PRIVATE_KEY: z.string().min(1).optional(),
  DRIVE_TEMPLATES_FOLDER_ID: z.string().min(1).optional(),
});

/**
 * Web Dashboard Environment Schema
 */
export const WebEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  NODE_ENV: NodeEnvSchema,
});

/**
 * Common Agent Environment Schema
 */
export const AgentEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: NodeEnvSchema,
  LOG_LEVEL: LogLevelSchema,
  ANTHROPIC_API_KEY: z.string().min(10),
  POLL_INTERVAL_MINUTES: z.coerce.number().int().positive().default(5),
  GMAIL_QUERY: z.string().optional(),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  HUBSPOT_API_KEY: z.string().optional(),
  HUBSPOT_OAUTH_TOKEN: z.string().optional(),
  SALESFORCE_API_KEY: z.string().optional(),
  SALESFORCE_OAUTH_TOKEN: z.string().optional(),
  PIPEDRIVE_API_KEY: z.string().optional(),
  PIPEDRIVE_OAUTH_TOKEN: z.string().optional(),
});

export type ApiEnv = z.output<typeof ApiEnvSchema>;
export type McpEnv = z.output<typeof McpEnvSchema>;
export type WebEnv = z.output<typeof WebEnvSchema>;
export type AgentEnv = z.output<typeof AgentEnvSchema>;

/**
 * Helper to load and validate environment variables
 */
function validateEnv<T extends z.ZodTypeAny>(schema: T, source: Record<string, unknown> = process.env as any): z.output<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    const errorMsg = `Invalid environment configuration:\n${issues}`;
    
    if (process.env.NODE_ENV === 'production') {
      console.error(errorMsg);
      process.exit(1);
    } else if (process.env.NODE_ENV !== 'test') {
      console.warn(errorMsg);
    }
    
    // In tests or non-production, we might want to throw or just return what we have
    // but for type safety we re-parse or throw
    return schema.parse(source);
  }

  return result.data;
}

export function loadApiEnv(source?: Record<string, unknown>): ApiEnv {
  return validateEnv(ApiEnvSchema, source);
}

export function loadMcpEnv(source?: Record<string, unknown>): McpEnv {
  return validateEnv(McpEnvSchema, source);
}

export function loadWebEnv(source?: Record<string, unknown>): WebEnv {
  return validateEnv(WebEnvSchema, source);
}

export function loadAgentEnv(source?: Record<string, unknown>): AgentEnv {
  return validateEnv(AgentEnvSchema, source);
}
