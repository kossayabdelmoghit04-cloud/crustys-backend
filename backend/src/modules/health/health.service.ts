import { prisma } from '../../utils/prisma';
import { redisClient } from '../../config/redis';
import { DIAGNOSTIC_CONFIG } from '../../config/diagnostics';
import fs from 'fs';
import path from 'path';

export class HealthService {
  /**
   * Verifies the connection to the PostgreSQL database via Prisma
   */
  static async checkDatabase(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifies the connection to the Redis server
   */
  static async checkRedis(): Promise<boolean> {
    try {
      // If standalone Redis is disabled in diagnostics, we mock the success
      if (!DIAGNOSTIC_CONFIG.enableStandaloneRedis) {
        return true;
      }
      
      if (typeof redisClient.ping === 'function') {
        const response = await redisClient.ping();
        return response === 'PONG';
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the uptime of the Node.js process in seconds
   */
  static getUptime(): number {
    return process.uptime();
  }

  /**
   * Reads the application version from package.json
   */
  static getAppVersion(): string {
    try {
      const packagePath = path.resolve(__dirname, '../../../../package.json');
      if (fs.existsSync(packagePath)) {
        const packageContent = fs.readFileSync(packagePath, 'utf8');
        const pkg = JSON.parse(packageContent);
        return pkg.version || '1.0.0';
      }
    } catch (error) {
      // Fallback in case of resolving/reading errors
    }
    return '1.0.0';
  }
}
