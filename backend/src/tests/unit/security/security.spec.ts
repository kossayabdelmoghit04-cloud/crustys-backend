import { authorize } from '../../../middlewares/authorize';
import { IPReputationService } from '../../../security/ip-reputation.service';
import { SuspiciousRequestDetector } from '../../../security/suspicious-request.detector';
import { apiRateLimiter, limiterOptions } from '../../../middlewares/api-rate-limit.middleware';
import { Request, Response } from 'express';
import { AppError } from '../../../utils/appError';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SECURITY & RBAC MODULE UNIT TESTS', () => {
  beforeAll(() => {
    // Prevent the setInterval in ip-reputation.service from keeping Jest open
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset IP reputation store for isolation
    IPReputationService.resetReputation('127.0.0.1');
    IPReputationService.resetReputation('192.168.1.1');
  });

  describe('RBAC authorize.ts Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      mockReq = {};
      mockRes = {};
      next = jest.fn();
    });

    it('should call next with 401 AppError if req.user is missing', () => {
      const middleware = authorize('ADMIN');
      middleware(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('Authentification requise');
    });

    it('should call next with 403 AppError if user role is not allowed', () => {
      mockReq.user = { id: 'usr-1', role: 'CUSTOMER', email: 'c@example.com', permissions: [] } as any;
      const middleware = authorize('ADMIN', 'MANAGER');
      middleware(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('Privilèges insuffisants');
    });

    it('should call next (allow access) if user has allowed role', () => {
      mockReq.user = { id: 'usr-1', role: 'MANAGER', email: 'm@example.com', permissions: [] } as any;
      const middleware = authorize('ADMIN', 'MANAGER');
      middleware(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledWith(); // called with no arguments, indicating success
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should map legacy "Super Admin" role to "ADMIN" correctly', () => {
      mockReq.user = { id: 'usr-1', role: 'Super Admin', email: 'sa@example.com', permissions: [] } as any;
      const middleware = authorize('ADMIN');
      middleware(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('IPReputationService', () => {
    const targetIP = '192.168.1.1';

    it('should start with a score of 0', () => {
      const score = IPReputationService.getScore(targetIP);
      expect(score).toBe(0);
      expect(IPReputationService.isHostile(targetIP)).toBe(false);
    });

    it('should add infractions and accumulate threat points', () => {
      IPReputationService.addInfraction(targetIP, 30, 'SQL injection attempt');
      expect(IPReputationService.getScore(targetIP)).toBe(30);
      expect(IPReputationService.isHostile(targetIP)).toBe(false);

      IPReputationService.addInfraction(targetIP, 80, 'Honeypot hit');
      expect(IPReputationService.getScore(targetIP)).toBe(110);
      expect(IPReputationService.isHostile(targetIP)).toBe(true); // default autoban threshold is 100
    });

    it('should check warn status appropriately', () => {
      // Threshold for warn is 30, autoban is 100
      IPReputationService.addInfraction(targetIP, 40, 'Suspicious query');
      expect(IPReputationService.isWarning(targetIP)).toBe(true);

      IPReputationService.addInfraction(targetIP, 80, 'Another attempt');
      expect(IPReputationService.isWarning(targetIP)).toBe(false); // It became hostile (autobanned)
    });
  });

  describe('SuspiciousRequestDetector', () => {
    it('should allow legitimate traffic without blocking or warning', () => {
      const verdict = SuspiciousRequestDetector.evaluate({
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        url: '/api/products?category=burgers',
        method: 'GET',
      });

      expect(verdict.shouldBlock).toBe(false);
      expect(verdict.shouldWarn).toBe(false);
      expect(verdict.isScanner).toBe(false);
      expect(verdict.isHoneypot).toBe(false);
    });

    it('should block scanner user-agents instantly', () => {
      const verdict = SuspiciousRequestDetector.evaluate({
        ip: '127.0.0.1',
        userAgent: 'sqlmap/1.4.12#stable (http://sqlmap.org)',
        url: '/api/products',
        method: 'GET',
      });

      expect(verdict.shouldBlock).toBe(true);
      expect(verdict.isScanner).toBe(true);
    });

    it('should block requests to honeypot paths', () => {
      const verdict = SuspiciousRequestDetector.evaluate({
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        url: '/wp-admin/index.php', // Honeypot trigger path
        method: 'GET',
      });

      expect(verdict.shouldBlock).toBe(true);
      expect(verdict.isHoneypot).toBe(true);
    });

    it('should flag and block SQL Injection attack signatures in query strings', () => {
      const verdict = SuspiciousRequestDetector.evaluate({
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        url: '/api/products?id=1%20OR%201=1', // SQLi signature
        method: 'GET',
        query: { id: "1' OR '1'='1" },
      });

      expect(verdict.shouldBlock).toBe(true);
      expect(verdict.analysis.isSuspicious).toBe(true);
      expect(verdict.totalThreatScore).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiter Middleware settings', () => {
    it('should correctly determine which paths to skip limiters', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const reqMockHealth = { path: '/health' } as Request;
      const reqMockDocs = { path: '/api/docs/index.html' } as Request;
      const reqMockOrders = { path: '/api/orders' } as Request;

      try {
        expect(limiterOptions.skip(reqMockHealth)).toBe(true);
        expect(limiterOptions.skip(reqMockDocs)).toBe(true);
        expect(limiterOptions.skip(reqMockOrders)).toBe(false);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should generate appropriate rate limit keys based on request IP', () => {
      const reqMockIp = { ip: '1.2.3.4' } as Request;
      const reqMockSocket = { socket: { remoteAddress: '5.6.7.8' } } as any as Request;

      expect(limiterOptions.keyGenerator(reqMockIp)).toBe('1.2.3.4');
      expect(limiterOptions.keyGenerator(reqMockSocket)).toBe('5.6.7.8');
    });
  });
});
