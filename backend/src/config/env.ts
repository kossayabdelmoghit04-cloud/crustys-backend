import dotenv from 'dotenv';
import path from 'path';
import { envSchema } from './env.validation';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
export type EnvConfig = import('./env.validation').EnvConfig;

