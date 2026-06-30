/**
 * @swagger
 * tags:
 *   name: Health
 *   description: System Health & Queue Monitoring
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Retrieve general backend API health status
 *     description: Returns detailed operational health data, system uptime, database/redis connectivity, and Sentry monitoring indicators.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy and responding.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-05-23T18:00:00.000Z"
 *                 uptime:
 *                   type: number
 *                   example: 124.5
 *                 environment:
 *                   type: string
 *                   example: "development"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 sentryStatus:
 *                   type: string
 *                   example: "active"
 *                 sentryEnvironment:
 *                   type: string
 *                   example: "development"
 *                 lastErrorTimestamp:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   example: "2026-05-23T18:10:00.000Z"
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: "up"
 *                     redis:
 *                       type: string
 *                       example: "up"
 */

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Retrieve Prometheus format system metrics
 *     description: Returns Prometheus-compatible metrics (including Node.js, database, redis, BullMQ queues, security alerts, and Sentry variables status). Restricted to ADMIN role.
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prometheus system metrics response.
 *         content:
 *           text/plain; version=0.0.4:
 *             schema:
 *               type: string
 *               example: |
 *                 # HELP crustys_sentry_connected Sentry connection status (1 = Active/DSN set, 0 = Inactive)
 *                 # TYPE crustys_sentry_connected gauge
 *                 crustys_sentry_connected 1
 *                 # HELP crustys_sentry_last_error_timestamp_seconds UNIX timestamp in seconds of the last captured error
 *                 # TYPE crustys_sentry_last_error_timestamp_seconds gauge
 *                 crustys_sentry_last_error_timestamp_seconds 1779840000
 *       401:
 *         description: Unauthorized. Token is missing or invalid.
 *       403:
 *         description: Forbidden. Requires ADMIN role.
 */

/**
 * @swagger
 * /dev/sentry-test:
 *   get:
 *     summary: Trigger a test error for Sentry verification
 *     description: Throws a runtime Error("Sentry test") to validate Sentry integration. Available only in development/testing mode.
 *     tags: [Health]
 *     responses:
 *       500:
 *         description: Sentry test exception triggered successfully.
 *       403:
 *         description: Forbidden. Attempted in production environment.
 */

/**
 * @swagger
 * /health/queues:
 *   get:
 *     summary: Retrieve BullMQ async email queue metrics
 *     description: |
 *       Returns dynamic real-time job counts (waiting, active, completed, failed, delayed) 
 *       from the BullMQ Redis queue. Requires active Redis connection.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Queue status and metrics successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 queues:
 *                   type: object
 *                   properties:
 *                     emails:
 *                       type: object
 *                       properties:
 *                         waiting:
 *                           type: integer
 *                           description: Number of jobs waiting in the queue
 *                           example: 0
 *                         active:
 *                           type: integer
 *                           description: Number of jobs currently being processed
 *                           example: 1
 *                         completed:
 *                           type: integer
 *                           description: Total completed jobs remaining in Redis storage
 *                           example: 124
 *                         failed:
 *                           type: integer
 *                           description: Total failed jobs remaining in Redis storage
 *                           example: 2
 *                         delayed:
 *                           type: integer
 *                           description: Number of scheduled or delayed jobs
 *                           example: 0
 *       503:
 *         description: Service Unavailable. Redis or queue manager connection failed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Queue service unavailable"
 *                 error:
 *                   type: string
 *                   example: "Redis connection timed out"
 */
