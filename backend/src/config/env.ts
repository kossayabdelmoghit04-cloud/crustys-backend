import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const stripQuotes = (val: unknown) => {
  if (typeof val !== 'string') return val;
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1);
  }
  if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1);
  }
  return s;
};

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  JWT_SECRET: z.preprocess(stripQuotes, z.string().min(8, 'JWT_SECRET must be at least 8 characters long')),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.preprocess(stripQuotes, z.string().min(8, 'JWT_REFRESH_SECRET must be at least 8 characters long')),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  STRIPE_SECRET_KEY: z.preprocess(stripQuotes, z.string().default('sk_test_51Pabcdefghijklmnopqrstuvwxyz1234567890mock')),
  STRIPE_WEBHOOK_SECRET: z.preprocess(stripQuotes, z.string().default('whsec_mockwebhooksecretkeysignatures123456')),
  
  // Email Configuration (SaaS Core)
  MAIL_PROVIDER: z.enum(['resend', 'mailtrap']).default('mailtrap'),
  MAIL_FROM: z.string().default('noreply@crustys.com'),
  RESEND_API_KEY: z.preprocess(stripQuotes, z.string().optional()),
  MAILTRAP_HOST: z.string().optional(),
  MAILTRAP_PORT: z.coerce.number().optional(),
  MAILTRAP_USER: z.string().optional(),
  MAILTRAP_PASS: z.string().optional(),

  // Redis Configuration for BullMQ
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.preprocess(stripQuotes, z.string().optional()),
  REDIS_DB: z.coerce.number().default(0),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
export type EnvConfig = z.infer<typeof envSchema>;
