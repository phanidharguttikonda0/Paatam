import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { SubmissionController } from '../controllers/submission.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import {
  uploadUrlsSchema,
  processAsyncSchema,
  createSyncSchema,
  publishAssignmentSchema,
  listAssignmentsSchema,
} from '../schemas/assignment.schema';
import { assignmentSubmissionsQuerySchema } from '../schemas/submission.schema';
import { UserRole } from '../enums/role.enum';

const router = Router();

// Pre-signed S3 upload URLs for question paper and answer key
router.post(
  '/upload-urls',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN]),
  validate(uploadUrlsSchema),
  AssignmentController.generateUploadUrls
);

// Async OCR and dynamic reasoning model selection queue
router.post(
  '/process-async',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN]),
  validate(processAsyncSchema),
  AssignmentController.processAsync
);

// Poll OCR extraction and model selection status
router.get(
  '/:id/pipeline-status',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN]),
  AssignmentController.getPipelineStatus
);

// Synchronous upload & inline OCR fallback
router.post(
  '/create-sync',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN]),
  validate(createSyncSchema),
  AssignmentController.createSync
);

// Finalize and publish assignment
router.post(
  '/',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN]),
  validate(publishAssignmentSchema),
  AssignmentController.publishAssignment
);

// List assignments with filtering
router.get(
  '/',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN]),
  validate(listAssignmentsSchema),
  AssignmentController.listAssignments
);

// List student submissions for an assignment
router.get(
  '/:id/submissions',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(assignmentSubmissionsQuerySchema),
  SubmissionController.getAssignmentSubmissions
);

// Get single assignment with question details (accessible to Teacher, Branch Admin & Student)
router.get(
  '/:id',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN, UserRole.STUDENT]),
  AssignmentController.getAssignmentById
);

// Delete assignment and purge related submissions
router.delete(
  '/:id',
  requireAuth,
  requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN]),
  AssignmentController.deleteAssignment
);

export default router;
