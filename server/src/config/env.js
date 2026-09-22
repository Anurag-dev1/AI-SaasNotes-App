require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().url(),
  REQUIRE_EMAIL_VERIFICATION: z.enum(['true', 'false']).default('true'),
  CORS_ORIGIN: z.string().url().optional(),
  REDIS_CACHE_URL: z.string().url(),
  REDIS_DURABLE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  AI_PROVIDER: z.enum(['google', 'openai']).default('google'),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  SUMMARY_MODEL: z.string().default('gemini-2.0-flash'),
  AI_CONTENT_MAX_BYTES: z.coerce.number().default(16384),
  AI_TENANT_HOURLY_QUOTA: z.coerce.number().default(100),
  EMAIL_FROM: z.string().email(),
  SMTP_URL: z.string().url(),
  PROBE_SECRET: z.string().min(8),
  REDIS_CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(120),
  WORKER_CONCURRENCY: z.coerce.number().default(5)
}).superRefine((data, ctx) => {
  if (data.AI_PROVIDER === 'google' && !data.GOOGLE_AI_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'GOOGLE_AI_API_KEY is required when AI_PROVIDER is google',
      path: ['GOOGLE_AI_API_KEY']
    });
  }
  if (data.AI_PROVIDER === 'openai' && !data.OPENAI_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'OPENAI_API_KEY is required when AI_PROVIDER is openai',
      path: ['OPENAI_API_KEY']
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

module.exports = parsed.data;
