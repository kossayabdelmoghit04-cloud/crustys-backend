import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { loginAsAdmin, loginAsCustomer, generateExpiredToken } from '../helpers/auth.helper';
import { IPReputationService } from '../../src/security/ip-reputation.service';
import { BruteForceService } from '../../src/security/brute-force.service';
import { securityMetrics } from '../../src/metrics/security.metrics';
import { hppMiddleware } from '../../src/middlewares/security.middleware';
import { prisma } from '../../src/utils/prisma';

describe('Security & RBAC Integration Tests', () => {
  let adminToken: string;
  let customerToken: string;
  let customerUser: any;

  beforeAll(async () => {
    await seedTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestDatabase();

    // Reset security metrics and IP reputations for local test IPs
    securityMetrics.reset();
    
    const adminSession = await loginAsAdmin();
    adminToken = adminSession.token;

    const customerSession = await loginAsCustomer({ email: 'client@test.com' });
    customerToken = customerSession.token;
    customerUser = customerSession.user;
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('HTTP Header Hardening (Helmet)', () => {
    it('should include security headers in responses', async () => {
      const res = await request.get('/health').expect(200);

      // Validate Helmet headers
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('HTTP Parameter Pollution (HPP)', () => {
    it('should flatten non-whitelisted duplicate query parameters via middleware', () => {
      const req = {
        query: { nonwhite: ['1', '2'], page: ['1', '2'] },
      } as any;
      const res = {} as any;
      const next = jest.fn();

      hppMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      // non-whitelisted is flattened to the last value
      expect(req.query.nonwhite).toBe('2');
      // whitelisted (like page) is allowed to remain as an array
      expect(req.query.page).toEqual(['1', '2']);
    });

    it('should not crash the server when duplicate parameters are sent', async () => {
      await request
        .get('/api/v1/products?limit=10&limit=20&search=pizza&search=burger')
        .expect(200);
    });
  });

  describe('SQL Injection (SQLi) Protection', () => {
    it('should block requests with critical SQLi payloads', async () => {
      const payload = "SELECT * FROM users; DROP TABLE products";
      
      const res = await request
        .get(`/api/v1/products?search=${encodeURIComponent(payload)}`)
        .set('X-Forwarded-For', '203.0.113.10')
        .expect(403);

      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('SUSPICIOUS_REQUEST_BLOCKED');
      expect(res.body.message).toContain('suspicious content');
    });

    it('should allow but warn on medium-severity SQLi keyword payloads', async () => {
      // "SELECT * FROM users" by itself is SQLI_001 (40 points), which is below the 50 block threshold
      const payload = "SELECT * FROM users";
      
      await request
        .get(`/api/v1/products?search=${encodeURIComponent(payload)}`)
        .set('X-Forwarded-For', '203.0.113.11')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')
        .expect(200);

      // Verify a warning was tracked in metrics
      const report = securityMetrics.getReport();
      expect(report.suspiciousRequests).toBeGreaterThanOrEqual(1);
    });

    it('should block SQLi payloads inside POST request body', async () => {
      const payload = {
        email: "hacker@test.com",
        password: "SELECT * FROM users; DROP TABLE products",
      };

      const res = await request
        .post('/api/v1/auth/login')
        .send(payload)
        .set('X-Forwarded-For', '203.0.113.12')
        .expect(403);

      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('SUSPICIOUS_REQUEST_BLOCKED');
    });
  });

  describe('Cross-Site Scripting (XSS) Protection', () => {
    it('should block critical XSS payloads', async () => {
      // script tag (35) + alert (30) = 65 points >= 50 threshold
      const payload = {
        customerName: 'Hacker',
        message: "<script>alert('xss')</script>",
        rating: 5,
      };

      const res = await request
        .post('/api/v1/testimonials')
        .send(payload)
        .set('X-Forwarded-For', '203.0.113.20')
        .expect(403);

      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('SUSPICIOUS_REQUEST_BLOCKED');
    });

    it('should sanitize benign HTML tags in request body through sanitizeBody', async () => {
      // script tag by itself is 35 points, which is < 50 threshold, so it won't block
      // but sanitizeBody will scrub the script tag out
      const payload = {
        customerName: 'Benign User',
        message: 'This is a message <script>console.log("hello")</script> with script tag',
        rating: 5,
      };

      const res = await request
        .post('/api/v1/testimonials')
        .send(payload)
        .set('X-Forwarded-For', '203.0.113.21')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')
        .expect(201);

      expect(res.body.status).toBe('success');
      
      // Check database to ensure it was sanitized
      const dbTestimonial = await prisma.testimonial.findUnique({
        where: { id: res.body.data.testimonial.id }
      });
      
      expect(dbTestimonial?.message).not.toContain('<script>');
      expect(dbTestimonial?.message).toContain('This is a message');
    });
  });

  describe('Honeypot Path Protection', () => {
    it('should block access to typical honeypot paths', async () => {
      const paths = ['/wp-admin', '/.env', '/admin.php'];

      for (const path of paths) {
        const res = await request
          .get(path)
          .set('X-Forwarded-For', '203.0.113.30')
          .expect(403);

        expect(res.body.status).toBe('error');
        expect(res.body.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Vulnerability Scanner Detection', () => {
    it('should block requests from known scanner User-Agents', async () => {
      const scanners = ['sqlmap/1.5.8', 'nikto/2.1.6', 'nmap', 'burpsuite'];

      for (const ua of scanners) {
        const res = await request
          .get('/health')
          .set('User-Agent', ua)
          .set('X-Forwarded-For', '203.0.113.40')
          .expect(403);

        expect(res.body.status).toBe('error');
        expect(res.body.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Bot User-Agent Detection', () => {
    it('should detect bot User-Agents and increment bot metrics', async () => {
      // axios UA triggers BOT_INDICATORS (+10 points) but does not exceed the block threshold
      await request
        .get('/health')
        .set('User-Agent', 'axios/1.6.0')
        .set('X-Forwarded-For', '203.0.113.50')
        .expect(200);

      const report = securityMetrics.getReport();
      expect(report.botsDetected).toBeGreaterThanOrEqual(1);
    });
  });

  describe('JWT Security', () => {
    it('should deny access if Authorization header is missing', async () => {
      await request
        .get('/api/v1/users')
        .expect(401);
    });

    it('should deny access if token is malformed', async () => {
      await request
        .get('/api/v1/users')
        .set('Authorization', 'Bearer invalid-token-value')
        .expect(401);
    });

    it('should deny access if token is expired', async () => {
      const expiredToken = generateExpiredToken({
        userId: customerUser.id,
        email: customerUser.email,
        role: 'CUSTOMER'
      });

      await request
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('RBAC Bypass Prevention', () => {
    it('should prevent CUSTOMER role from accessing admin endpoints', async () => {
      await authRequest(customerToken)
        .get('/api/v1/users')
        .expect(403);
    });

    it('should prevent CUSTOMER role from accessing security metrics dashboard', async () => {
      await authRequest(customerToken)
        .get('/api/v1/security/metrics')
        .expect(403);
    });

    it('should allow ADMIN role to access security metrics dashboard', async () => {
      const res = await authRequest(adminToken)
        .get('/api/v1/security/metrics')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.blockedRequests).toBeDefined();
    });
  });

  describe('API Rate Limiting', () => {
    it('should trigger rate limiting on auth endpoints after exceeding limits', async () => {
      const payload = { email: 'wrong@user.com', password: 'wrongpassword' };
      const ip = '203.0.113.60';

      // The authRateLimiter limit is 5 requests per minute
      // Let's send 5 requests, which should return 401 Unauthorized
      for (let i = 0; i < 5; i++) {
        await request
          .post('/api/v1/auth/login')
          .send(payload)
          .set('X-Forwarded-For', ip)
          .expect(401);
      }

      // The 6th request from the same IP should be blocked with 429 Too Many Requests
      const res = await request
        .post('/api/v1/auth/login')
        .send(payload)
        .set('X-Forwarded-For', ip)
        .expect(429);

      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
      expect(res.body.message).toContain('Trop de tentatives');
    });
  });

  describe('IP Reputation Autoban', () => {
    it('should block all subsequent requests once an IP is flagged as hostile', async () => {
      const hostileIP = '203.0.113.70';

      // 1. Initially, the IP is healthy, request is allowed
      await request
        .get('/health')
        .set('X-Forwarded-For', hostileIP)
        .expect(200);

      // 2. Add infractions to exceed autoban threshold (80 points)
      IPReputationService.addInfraction(hostileIP, 85, 'Manual test trigger autoban');
      expect(IPReputationService.isHostile(hostileIP)).toBe(true);

      // 3. Subsequent request from the banned IP should be blocked, even if it is a benign request
      const res = await request
        .get('/health')
        .set('X-Forwarded-For', hostileIP)
        .expect(403);

      expect(res.body.status).toBe('error');
      expect(res.body.code).toBe('SUSPICIOUS_REQUEST_BLOCKED');
    });
  });
});
