import { Router } from 'express';
import { SubjectController } from '../controllers/subject.controller';
import { validate } from '../middlewares/validate';
import { updateSubjectSchema } from '../schemas/subject.schema';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);

// PUT /api/subjects/:subjectId (BRANCH_ADMIN, CORPORATE_ADMIN)
router.put(
  '/:subjectId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(updateSubjectSchema),
  SubjectController.updateSubject
);

// DELETE /api/subjects/:subjectId (BRANCH_ADMIN, CORPORATE_ADMIN)
router.delete(
  '/:subjectId',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  SubjectController.deleteSubject
);

export default router;
