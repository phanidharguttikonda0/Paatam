import { z } from 'zod';

export const createAcademicYearSchema = z.object({
  body: z.object({
    start_year: z.number().int().min(2000).max(2100),
    end_year: z.number().int().min(2000).max(2100),
    is_active: z.boolean().optional(),
  }),
});

export const updateAcademicYearSchema = z.object({
  body: z.object({
    start_year: z.number().int().min(2000).max(2100).optional(),
    end_year: z.number().int().min(2000).max(2100).optional(),
    is_active: z.boolean().optional(),
  }),
});
