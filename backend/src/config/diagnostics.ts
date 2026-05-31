/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🧪 DIAGNOSTIC TOGGLES FOR SYSTEMATIC BINARY SEARCH
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Use these toggles to isolate suspect modules during 502 troubleshooting.
 */
export const DIAGNOSTIC_CONFIG = {
  // Group A (Middlewares & Handlers)
  enableHelmet: true,
  enableHpp: true,
  enableCors: true,
  enableCookies: true,
  enableMorgan: true,
  enableRequestFingerprint: true, // Group A Suspect
  enableIpTracking: true,         // Group A Suspect
  enableSuspiciousRequest: true,  // Group A Suspect
  enableApiRateLimit: true,       // Group A Suspect
  enableAuthRateLimit: true,      // Group A Suspect
  enableBruteForce: true,         // Group A Suspect
  enableSwagger: true,            // Group A Suspect
  enableGeoIP: false,              // Group A Suspect (geoip-lite DB sync loading)
  enableUserAgent: false,          // Group A Suspect (useragent parser / ReDoS)

  // Group B (Background Services & Connections)
  enableBullMQ: false,            // Group B Suspect (redis connection, email queues, workers)
  enableCron: false,              // Group B Suspect (cleanup.cron)
  enableStandaloneRedis: false,   // Standalone Redis client connection (disabled in Deployment 1 to avoid ioredis)

};
