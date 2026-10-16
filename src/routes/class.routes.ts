import { Router } from 'express';
import { ClassController } from '../controllers/class.controller';
import { SectionController } from '../controllers/section.controller';
import { SubjectController } from '../controllers/subject.controller';
import { validate } from '../middlewares/validate';
import { updateClassSchema } from '../schemas/class.schema';
import { createSectionSchema } from '../schemas/section.schema';
import { attachSubjectToClassSchema } from '../schemas/subject.schema';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);

// GET /api/classes/:classId/sections (BRANCH_ADMIN, TEACHER, CORPORATE_ADMIN)
router.get(
  '/:classId/sections',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CORPORATE_ADMIN]),
  SectionController.getSectionsForClass
);

// POST /api/classes/:classId/sections (BRANCH_ADMIN, CORPORATE_ADMIN)
router.post(
  '/:classId/sections',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(createSectionSchema),
  SectionController.createSection
);

// GET /api/classes/:classId/subjects (BRANCH_ADMIN, TEACHER, CORPORATE_ADMIN)
router.get(
  '/:classId/subjects',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CORPORATE_ADMIN]),
  SubjectController.getClassSubjects
);

// POST /api/classes/:classId/subjects (BRANCH_ADMIN, CORPORATE_ADMIN)
router.post(
  '/:classId/subjects',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(attachSubjectToClassSchema),
  SubjectController.attachSubjectToClass
);

// DELETE /api/classes/:classId/subjects/:classSubjectId (BRANCH_ADMIN, CORPORATE_ADMIN)
router.delete(
  '/:classId/subjects/:classSubjectId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  SubjectController.removeClassSubject
);

// GET /api/classes/:classId (BRANCH_ADMIN, TEACHER, CORPORATE_ADMIN)
router.get(
  '/:classId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CORPORATE_ADMIN]),
  ClassController.getClassDetails
);

// PUT /api/classes/:classId (BRANCH_ADMIN, CORPORATE_ADMIN)
router.put(
  '/:classId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(updateClassSchema),
  ClassController.updateClass
);

// DELETE /api/classes/:classId (BRANCH_ADMIN, CORPORATE_ADMIN)
router.delete(
  '/:classId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  ClassController.deleteClass
);

export default router;
