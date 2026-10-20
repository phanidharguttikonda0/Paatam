import { z } from 'zod';

export const ingestChapterSchema = z.object({
  body: z.object({
    class_subject_id: z.string().min(1, 'class_subject_id is required'),
    chapter_text: z.string().min(10, 'chapter_text must be at least 10 characters'),
    pdf_url: z.string().url().optional(),
    chapter_title: z.string().optional(),
    chapter_number: z.coerce.number().int().positive().optional(),
    file_name: z.string().optional(),
  }),
});

export const listChaptersSchema = z.object({
  query: z.object({
    class_subject_id: z.string().min(1, 'class_subject_id is required'),
  }),
});

export const ingestSyllabusSchema = z.object({
  body: z.object({
    class_subject_id: z.string().min(1, 'class_subject_id is required'),
    syllabus_text: z.string().min(10, 'syllabus_text must be at least 10 characters'),
  }),
});

export const listTopicsSchema = z.object({
  query: z.object({
    class_subject_id: z.string().min(1, 'class_subject_id is required'),
  }),
});
