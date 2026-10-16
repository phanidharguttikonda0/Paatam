import { Router } from 'express';
import { SectionController } from '../controllers/section.controller';
import { validate } from '../middlewares/validate';
import {
  updateSectionSchema,
  assignClassTeacherSchema,
} from '../schemas/section.schema';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);

// GET /api/sections/:sectionId/subjects-teachers (BRANCH_ADMIN, TEACHER, CORPORATE_ADMIN)
router.get(
  '/:sectionId/subjects-teachers',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CORPORATE_ADMIN]),
  SectionController.getSectionSubjectsTeachers
);

// PUT /api/sections/:sectionId/class-teacher (BRANCH_ADMIN, CORPORATE_ADMIN)
router.put(
  '/:sectionId/class-teacher',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(assignClassTeacherSchema),
  SectionController.assignClassTeacher
);

// DELETE /api/sections/:sectionId/class-teacher (BRANCH_ADMIN, CORPORATE_ADMIN)
router.delete(
  '/:sectionId/class-teacher',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  SectionController.removeClassTeacher
);

// GET /api/sections/:sectionId (BRANCH_ADMIN, TEACHER, CORPORATE_ADMIN)
router.get(
  '/:sectionId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CORPORATE_ADMIN]),
  SectionController.getSectionDetails
);

// PUT /api/sections/:sectionId (BRANCH_ADMIN, CORPORATE_ADMIN)
router.put(
  '/:sectionId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(updateSectionSchema),
  SectionController.updateSection
);

// DELETE /api/sections/:sectionId (BRANCH_ADMIN, CORPORATE_ADMIN)
router.delete(
  '/:sectionId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  SectionController.deleteSection
);

export default router;
