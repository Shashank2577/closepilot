import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://closepilot:closepilot_dev@localhost:5432/closepilot',
  },
} satisfies Config;
