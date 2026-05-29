/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SECURITY CONFIGURATION — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Source unique de vérité pour tous les seuils,
 * durées, limites et politiques de sécurité.
 */

export const securityConfig = {
  // ── Global API Rate Limiting ──
  globalRateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // 100 requêtes / fenêtre / IP
    message: 'Trop de requêtes depuis cette adresse IP. Veuillez réessayer dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },

  // ── Auth / Login Rate Limiting ──
  authRateLimit: {
    windowMs: 60 * 1000,      // 1 minute
    max: 5,                    // 5 tentatives / minute / IP
    message: 'Trop de tentatives d\'authentification. Veuillez patienter avant de réessayer.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },

  // ── Brute Force Detection ──
  bruteForce: {
    maxFailedAttempts: 5,           // Seuil de détection
    windowMs: 15 * 60 * 1000,      // Fenêtre de 15 minutes
    banDurationMs: 30 * 60 * 1000, // Ban temporaire de 30 minutes
    escalationFactor: 2,            // Multiplicateur pour les récidivistes
    maxBanDurationMs: 24 * 60 * 60 * 1000, // Ban maximum de 24h
  },

  // ── Suspicious Request Scoring ──
  suspiciousRequest: {
    scoreThreshold: 50,        // Score à partir duquel on bloque
    warnThreshold: 25,         // Score à partir duquel on log un warning
    maxScorePerRequest: 100,   // Score maximum par requête
    autobanScore: 80,          // Score entraînant un ban automatique
  },

  // ── IP Tracking ──
  ipTracking: {
    enabled: true,
    logGeoLocation: true,
    logUserAgent: true,
  },

  // ── Helmet CSP Rules ──
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://*.cloudinary.com'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },

  // ── HPP Whitelist ──
  hppWhitelist: [
    'page',
    'sortBy',
    'sortOrder',
    'categoryId',
    'categorySlug',
    'minPrice',
    'maxPrice',
    'isAvailable',
    'isFeatured',
    'status',
    'tags',
  ],

  // ── Route Sensitivity Scoring ──
  routeSensitivity: {
    critical: ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password'],
    high: ['/api/v1/uploads', '/api/v1/admin', '/api/v1/users'],
    medium: ['/api/v1/products', '/api/v1/categories', '/api/v1/orders'],
    low: ['/api/v1/testimonials', '/api/v1/analytics'],
  },

  // ── Trusted Proxies ──
  trustedProxies: ['loopback', 'linklocal', 'uniquelocal'] as string[],

  // ── Honeypot ──
  honeypotPaths: [
    '/admin.php',
    '/wp-admin',
    '/wp-login.php',
    '/.env',
    '/xmlrpc.php',
    '/phpmyadmin',
    '/config.php',
    '/.git/config',
    '/actuator',
    '/debug',
  ],
} as const;
