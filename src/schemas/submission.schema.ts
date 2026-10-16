import { z } from 'zod';

export const assignmentSubmissionsQuerySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Assignment ID is required'),
  }),
  query: z.object({
    status: z.enum(['submitted', 'approved', 'pending_review']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(10).optional().default(10),
  }),
});

export const submissionIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Submission ID is required'),
  }),
});

export const approveSubmissionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Submission ID is required'),
  }),
  body: z.object({
    final_score: z.number().min(0, 'Final score must be non-negative').optional(),
    final_feedback: z.string().optional(),
    final_hint: z.string().optional(),
  }),
});

export const overrideSubmissionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Submission ID is required'),
  }),
  body: z.object({
    score: z.number().min(0, 'Score must be non-negative'),
    feedback: z.string().optional(),
    question_breakdown: z.array(z.any()).optional(),
  }),
});

export const bulkSubmissionSchema = z.object({
  body: z.object({
    assignment_id: z.union([z.string().min(1), z.number()]),
    bulk_mode: z.enum(['single_per_student', 'combined_pdf']).optional().default('combined_pdf'),
    total_files: z.coerce.number().int().min(1).optional(),
    files: z.any().optional(),
    sample_paper_urls: z.array(z.string()).optional(),
    file_urls: z.array(z.string()).optional(),
  }),
});

export const batchJobIdParamSchema = z.object({
  params: z.object({
    jobId: z.string().min(1, 'Job ID is required'),
  }),
});
