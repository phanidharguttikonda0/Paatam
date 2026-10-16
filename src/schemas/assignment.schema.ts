import { z } from 'zod';

export const uploadUrlsSchema = z.object({
  body: z.object({
    section_id: z.string().min(1, 'section_id is required'),
    files: z
      .array(
        z.object({
          file_name: z.string().min(1, 'file_name is required'),
          file_type: z.enum([
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/webp',
          ]),
          purpose: z.string().min(1, 'purpose is required'),
        })
      )
      .min(1, 'At least one file must be provided'),
  }),
});

export const processAsyncSchema = z.object({
  body: z.object({
    section_id: z.string().min(1, 'section_id is required'),
    class_subject_id: z.string().min(1, 'class_subject_id is required'),
    teacher_subject_id: z.string().optional(),
    title: z.string().min(1, 'title is required'),
    difficulty: z.string().optional().default('Medium'),
    duration_minutes: z.coerce.number().int().positive().optional().default(60),
    question_paper_url: z.string().url('question_paper_url must be a valid URL'),
    answer_key_url: z.string().url('answer_key_url must be a valid URL').optional(),
  }),
});

export const createSyncSchema = z.object({
  body: z.object({
    section_id: z.string().min(1, 'section_id is required'),
    class_subject_id: z.string().min(1, 'class_subject_id is required'),
    teacher_subject_id: z.string().optional(),
    title: z.string().min(1, 'title is required'),
    difficulty: z.string().optional().default('Medium'),
    duration_minutes: z.coerce.number().int().positive().optional().default(60),
    question_paper_url: z.string().optional(),
    question_paper: z.string().optional(),
    answer_key_url: z.string().optional(),
    answer_key: z.string().optional(),
    questions_json: z.array(z.any()).optional(),
  }).refine((data) => data.question_paper_url || data.question_paper, {
    message: 'question_paper_url or question_paper must be provided',
  }),
});

export const publishAssignmentSchema = z.object({
  body: z.object({
    id: z.string().optional(),
    assignment_id: z.string().optional(),
    section_id: z.string().min(1, 'section_id is required'),
    class_subject_id: z.string().min(1, 'class_subject_id is required'),
    teacher_subject_id: z.string().optional(),
    title: z.string().min(1, 'title is required'),
    difficulty: z.string().optional().default('Medium'),
    duration_minutes: z.coerce.number().int().positive().optional().default(60),
    due_date: z.string().datetime({ offset: true }).optional(),
    status: z.string().optional().default('published'),
    reasoning_model: z.string().optional().default('gemini-2.5-flash'),
    question_paper_url: z.string().min(1, 'question_paper_url is required'),
    answer_key_url: z.string().optional(),
    answer_key_text: z.string().optional(),
    questions_json: z.array(z.any()).optional().default([]),
  }),
});

export const listAssignmentsSchema = z.object({
  query: z.object({
    section_id: z.string().optional(),
    class_subject_id: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(10).optional().default(10),
  }),
});
