import { Router } from 'express';
import { TeacherController } from '../controllers/teacher.controller';
import { validate } from '../middlewares/validate';
import { updateTeacherSchema, mapTeacherSubjectSchema } from '../schemas/teacher.schema';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);

// GET /api/teachers/:teacherId
router.get(
  '/:teacherId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CORPORATE_ADMIN]),
  TeacherController.getTeacherById
);

// PUT /api/teachers/:teacherId
router.put(
  '/:teacherId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(updateTeacherSchema),
  TeacherController.updateTeacher
);

// DELETE /api/teachers/:teacherId
router.delete(
  '/:teacherId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  TeacherController.deleteTeacher
);

// GET /api/teachers/:teacherId/subjects
router.get(
  '/:teacherId/subjects',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CORPORATE_ADMIN]),
  TeacherController.getTeacherSubjects
);

// POST /api/teachers/:teacherId/subjects
router.post(
  '/:teacherId/subjects',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(mapTeacherSubjectSchema),
  TeacherController.mapSubjectToTeacher
);

// DELETE /api/teachers/:teacherId/subjects/:subjectId
router.delete(
  '/:teacherId/subjects/:subjectId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  TeacherController.unmapSubjectFromTeacher
);

// GET /api/teachers/:teacherId/sections
router.get(
  '/:teacherId/sections',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CORPORATE_ADMIN]),
  TeacherController.getTeacherSections
);

export default router;
