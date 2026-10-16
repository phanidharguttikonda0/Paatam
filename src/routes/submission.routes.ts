import { Router } from 'express';
import { SubmissionController } from '../controllers/submission.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import {
  submissionIdParamSchema,
  approveSubmissionSchema,
  overrideSubmissionSchema,
  bulkSubmissionSchema,
  batchJobIdParamSchema,
} from '../schemas/submission.schema';
import { UserRole } from '../enums/role.enum';

const router = Router();

// Apply auth & role requirements for all submission grading endpoints
router.use(requireAuth);
router.use(requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]));

// POST /api/submissions/bulk - Bulk upload answer sheets stack
router.post('/bulk', validate(bulkSubmissionSchema), SubmissionController.bulkUploadSubmissions);

// GET /api/submissions/batch/:jobId - Poll batch job status
router.get('/batch/:jobId', validate(batchJobIdParamSchema), SubmissionController.getBatchJobStatus);

// GET /api/submissions/:id - Full submission scorecard and OCR review
router.get('/:id', validate(submissionIdParamSchema), SubmissionController.getSubmissionById);

// POST /api/submissions/:id/approve - Approve evaluated paper & lock score
router.post('/:id/approve', validate(approveSubmissionSchema), SubmissionController.approveSubmission);

// POST /api/submissions/:id/override - Teacher manual score override
router.post('/:id/override', validate(overrideSubmissionSchema), SubmissionController.overrideSubmission);

export default router;
