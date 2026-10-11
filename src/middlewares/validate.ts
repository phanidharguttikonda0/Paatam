import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { AppError } from '../exceptions/AppError';

export const validate = (schema: ZodType<any> | any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      if (error instanceof ZodError || (error && typeof error === 'object' && ('issues' in error || 'errors' in error))) {
        const issues = error.issues || error.errors || [];
        const message = Array.isArray(issues) && issues.length > 0
          ? issues.map((e: any) => e.message).join(', ')
          : error.message || 'Validation failed';
        return next(new AppError(`Validation failed: ${message}`, 400));
      }
      next(error);
    }
  };
};
