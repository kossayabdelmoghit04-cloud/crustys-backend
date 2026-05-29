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
 *     description: Returns basic operational health data, timestamp, environment configuration, and status.
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
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Server is healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-05-23T18:00:00.000Z"
 *                 env:
 *                   type: string
 *                   example: "production"
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
