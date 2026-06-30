import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { recordSentryErrorTimestamp, reportCriticalFailure } from '../config/sentry';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Track the error occurrence timestamp in Sentry state
  recordSentryErrorTimestamp();

  // Extract request context parameters for Sentry enrichment
  const userId = req.user?.userId || req.user?.id || null;
  const adminId = req.user?.adminId || null;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const route = req.originalUrl || req.url;
  const requestId = (req as any).id || req.fingerprint || 'unknown';

  const isPrismaError =
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError;

  if (isPrismaError) {
    logger.error(`[Prisma Exception] ${err.name}: ${err.message}`);

    // Attach Prisma exception metadata to Sentry scope
    Sentry.configureScope((scope) => {
      scope.setTags({
        prisma: 'true',
        prisma_error_type: err.constructor.name,
        route,
        userId: String(userId || 'guest'),
        adminId: String(adminId || 'none'),
        ip,
        requestId,
      });
      scope.setExtras({
        route,
        userId,
        adminId,
        ip,
        requestId,
        error_details: err.message,
      });
    });

    // Handle Database Down scenarios
    if (err instanceof Prisma.PrismaClientInitializationError) {
      reportCriticalFailure(
        err,
        'DATABASE_DOWN',
        'Database Connection Error',
        `La base de données PostgreSQL est injoignable : ${err.message}`,
        { route, userId, adminId, ip, requestId }
      ).catch((notifyErr) => {
        logger.error(`[Sentry Error Handlers] Failed reporting DB failure: ${notifyErr.message}`);
      });
    } else {
      Sentry.captureException(err);
    }
  }

  // Log error
  if (!isOperational) {
    logger.error(`💥 Non-operational Error: ${err.message}`, { stack: err.stack });
    // Capture non-operational errors directly to Sentry if not already captured
    if (!isPrismaError) {
      Sentry.captureException(err);
    }
  } else {
    logger.warn(`⚠️ Operational Error [${statusCode}]: ${err.message}`);
  }

  const responseBody: {
    status: 'error' | 'fail';
    message: string;
    stack?: string;
  } = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
  };

  if (env.NODE_ENV === 'development') {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};
