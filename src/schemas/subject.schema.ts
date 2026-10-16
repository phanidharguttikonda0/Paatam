import { z } from 'zod';

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Subject name is required'),
    code: z.string().optional(),
    grade: z.string().optional(),
    board: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const updateSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Subject name cannot be empty').optional(),
    code: z.string().optional(),
    grade: z.string().optional(),
    board: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const attachSubjectToClassSchema = z.object({
  body: z.object({
    subject_id: z.string().or(z.number()),
  }),
});
