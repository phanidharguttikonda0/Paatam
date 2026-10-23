import { z } from 'zod';

export const analyticsOverviewQuerySchema = z.object({
  query: z.object({
    branch_id: z.string().optional(),
    class_id: z.string().optional(),
    section_id: z.string().optional(),
    subject_id: z.string().optional(),
    assignment_id: z.string().optional(),
    academic_year_id: z.string().optional(),
  }),
});

export const analyticsStudentsQuerySchema = z.object({
  query: z.object({
    branch_id: z.string().optional(),
    class_id: z.string().optional(),
    section_id: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
});
