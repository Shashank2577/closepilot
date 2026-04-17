import { Hono } from 'hono';

export const versionRoutes = new Hono();

versionRoutes.get('/', (c) => {
  return c.json({
    version: process.env.APP_VERSION || process.env.npm_package_version || '0.1.0',
    gitSha: process.env.GIT_SHA || null,
    builtAt: process.env.BUILT_AT || null,
    node: process.version,
  });
});
