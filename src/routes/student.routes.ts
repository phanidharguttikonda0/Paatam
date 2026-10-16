import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { validate } from '../middlewares/validate';
import { updateStudentSchema } from '../schemas/student.schema';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);

// GET /api/students/:studentId
router.get(
  '/:studentId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.CORPORATE_ADMIN]),
  StudentController.getStudentById
);

// PUT /api/students/:studentId
router.put(
  '/:studentId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CORPORATE_ADMIN]),
  validate(updateStudentSchema),
  StudentController.updateStudent
);

// DELETE /api/students/:studentId
router.delete(
  '/:studentId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  StudentController.deleteStudent
);

// GET /api/students/:studentId/submissions
router.get(
  '/:studentId/submissions',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.CORPORATE_ADMIN]),
  StudentController.getStudentSubmissions
);

export default router;
