import { z } from 'zod';

export const studentAssignmentsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'completed']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(10).optional().default(10),
  }),
});

export const submitAssignmentSchema = z.object({
  body: z.object({
    sample_paper_url: z.string().optional(),
    sample_paper_urls: z.array(z.string()).optional(),
    answer_sheets: z.any().optional(),
  }),
});
