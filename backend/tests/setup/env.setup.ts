import dotenv from 'dotenv';
import path from 'path';

// Load variables from main .env first, then override for test environment
dotenv.config({ path: path.join(__dirname, '../../.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.DATABASE_URL = 'postgresql://postgres:crustys2026@localhost:5433/crustys_express_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-chars-long!!';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-min-32-chars';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.ACCESS_TOKEN_SECRET = 'test-jwt-secret-key-minimum-32-chars-long!!';
process.env.REFRESH_TOKEN_SECRET = 'test-jwt-refresh-secret-key-min-32-chars';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_stripe_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_webhook_secret';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '1'; // Use DB 1 for testing
process.env.REDIS_PASSWORD = '';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-api-key';
process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.MAIL_PROVIDER = 'mailtrap';
process.env.MAIL_FROM = 'noreply@crustys.com';

// Mock console.log/info to keep test output clean, but let console.error pass
console.log = jest.fn();
console.info = jest.fn();
console.warn = jest.fn();
// We keep console.error in case we need to debug failing tests
