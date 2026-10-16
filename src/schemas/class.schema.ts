import { z } from 'zod';

export const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Class name cannot be empty'),
    class_order: z.number().int().positive('class_order must be a positive integer'),
    initial_sections: z.array(z.string().min(1)).optional(),
  }),
});

export const updateClassSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Class name cannot be empty').optional(),
    class_order: z.number().int().positive('class_order must be a positive integer').optional(),
  }),
});
