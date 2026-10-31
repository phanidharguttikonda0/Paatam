import { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/AppError';
import { logger } from '../config/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqContext = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    userId: (req as any).user?.userId || (req as any).user?.id,
  };

  if (err instanceof AppError) {
    logger.warn({ ...reqContext, statusCode: err.statusCode, message: err.message }, 'Client AppError');
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Handle BigInt conversion syntax errors (e.g. non-numeric ID passed)
  if (err instanceof SyntaxError && err.message.includes('BigInt')) {
    logger.warn({ ...reqContext, statusCode: 400, errMessage: err.message }, 'Invalid ID format syntax error');
    return res.status(400).json({
      status: 'error',
      message: 'Invalid ID format: must be a numeric integer',
    });
  }

  // Handle Prisma specific unique constraint failures
  if (err?.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    logger.warn({ ...reqContext, statusCode: 409, target, code: err.code }, 'Prisma unique constraint failure');
    return res.status(409).json({
      status: 'error',
      message: `A record with this ${target} already exists`,
    });
  }

  logger.error({ ...reqContext, err }, 'Unhandled Server Error');
  return res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
};
