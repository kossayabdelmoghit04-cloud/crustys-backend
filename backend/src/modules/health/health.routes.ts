import { Router } from 'express';
import { HealthController } from './health.controller';

const router = Router();

// Register the endpoints with support for aliases and versioned fallbacks
router.get(['/health', '/api/health', '/api/v1/health', '/healthz'], HealthController.getHealth);
router.get(['/ready', '/api/ready', '/api/v1/ready'], HealthController.getReady);
router.get(['/live', '/api/live', '/api/v1/live'], HealthController.getLive);

export default router;
