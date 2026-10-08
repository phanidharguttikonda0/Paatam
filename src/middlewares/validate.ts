import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { AppError } from '../exceptions/AppError';

export const validate = (schema: ZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Collect all Zod error messages
        const message = (error as any).errors.map((e: any) => e.message).join(', ');
        return next(new AppError(`Validation failed: ${message}`, 400));
      }
      next(error);
    }
  };
};
