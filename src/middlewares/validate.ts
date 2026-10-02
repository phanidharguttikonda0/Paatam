import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../exceptions/AppError';

export const validate = (schema: AnyZodObject) => {
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
        const message = error.errors.map((e) => e.message).join(', ');
        return next(new AppError(`Validation failed: ${message}`, 400));
      }
      next(error);
    }
  };
};
