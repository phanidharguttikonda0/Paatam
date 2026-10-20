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
    submission_mode: z.enum(['STUDENT_UPLOAD', 'TEACHER_UPLOAD']).optional().default('STUDENT_UPLOAD'),
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
    submission_mode: z.enum(['STUDENT_UPLOAD', 'TEACHER_UPLOAD']).optional().default('STUDENT_UPLOAD'),
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
    submission_mode: z.enum(['STUDENT_UPLOAD', 'TEACHER_UPLOAD']).optional().default('STUDENT_UPLOAD'),
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

export const generateExamSchema = z.object({
  body: z.object({
    class_subject_id: z.string().min(1, 'class_subject_id is required'),
    exam_title: z.string().min(1, 'exam_title is required'),
    target_marks: z.coerce.number().int().positive().default(40),
    language: z.string().optional().default('English'),
    difficulty: z.string().optional().default('Standard'),
    selected_chapters: z.array(z.string()).optional().default([]),
    selected_subtopics: z.array(z.string()).optional().default([]),
    question_counts: z.object({
      mcq_count: z.coerce.number().int().min(0).default(5),
      very_short_count: z.coerce.number().int().min(0).default(3),
      short_count: z.coerce.number().int().min(0).default(3),
      descriptive_count: z.coerce.number().int().min(0).default(2),
    }),
    marks_config: z.object({
      mcq: z.coerce.number().int().positive().optional().default(1),
      vsa: z.coerce.number().int().positive().optional().default(2),
      sa: z.coerce.number().int().positive().optional().default(3),
      long: z.coerce.number().int().positive().optional().default(5),
    }).optional(),
  }),
});

export const regenerateQuestionSchema = z.object({
  body: z.object({
    class_subject_id: z.string().min(1, 'class_subject_id is required'),
    chapter_title: z.string().min(1, 'chapter_title is required'),
    question_type: z.string().min(1, 'question_type is required'),
    marks: z.coerce.number().int().positive().default(1),
    current_question_text: z.string().optional(),
    subtopics: z.array(z.string()).optional().default([]),
    language: z.string().optional().default('English'),
    difficulty: z.string().optional().default('Standard'),
  }),
});

export const generateDiagramSchema = z.object({
  body: z.object({
    image_prompt: z.string().min(1, 'image_prompt is required'),
    question_text: z.string().min(1, 'question_text is required'),
    subject: z.string().optional().default('General'),
  }),
});
