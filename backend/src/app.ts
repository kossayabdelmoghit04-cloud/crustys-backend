import express from 'express';
import cors from 'cors';
import { env } from './config/env';

console.log('STEP 1: Starting Express Initialization');
const app = express();
console.log('STEP 2: Express App Instance Created');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORS & BODY PARSERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('STEP 3: Registering CORS & Cookie Parsers');
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('STEP 4: CORS & Body Parsers Registered');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEALTH CHECK ENDPOINTS & DEBUG ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('STEP 5: Registering Minimal Route Endpoints');

app.get('/railway-test', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Railway OK',
    timestamp: new Date().toISOString(),
    port: env.PORT,
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy (DEBUG MODE)',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

app.get('/', (_req, res) => {
  res.status(200).json({
    message: "Welcome to Crusty's Express API (DEBUG MODE)",
    version: '1.0.0-debug',
  });
});

console.log('STEP 6: Minimal Route Endpoints Registered');

export default app;
