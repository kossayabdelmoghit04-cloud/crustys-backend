import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

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

  // Log error
  if (!isOperational) {
    logger.error(`💥 Non-operational Error: ${err.message}`, { stack: err.stack });
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
