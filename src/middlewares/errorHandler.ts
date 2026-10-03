import { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/AppError';
import { logger } from '../config/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Handle Prisma specific unique constraint failures here optionally
  // e.g., if (err.code === 'P2002') return ...

  logger.error({ err }, 'Unhandled Error');
  return res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
};
