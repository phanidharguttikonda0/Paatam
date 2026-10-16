import { z } from 'zod';

export const createSectionSchema = z.object({
  body: z.object({
    section_name: z.string().min(1, 'Section name cannot be empty'),
    strength: z.number().int().min(0, 'Strength must be non-negative').default(0),
    class_teacher_id: z.string().or(z.number()).optional(),
  }),
});

export const updateSectionSchema = z.object({
  body: z.object({
    section_name: z.string().min(1, 'Section name cannot be empty').optional(),
    strength: z.number().int().min(0, 'Strength must be non-negative').optional(),
  }),
});

export const assignClassTeacherSchema = z.object({
  body: z.object({
    teacher_id: z.string().or(z.number()),
  }),
});
