import { Router } from 'express';
import { ClassController } from '../controllers/class.controller';
import { validate } from '../middlewares/validate';
import { updateClassSchema } from '../schemas/class.schema';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);

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
