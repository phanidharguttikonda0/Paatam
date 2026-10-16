import { Router } from 'express';
import { AcademicYearController } from '../controllers/academicYear.controller';
import { ClassController } from '../controllers/class.controller';
import { validate } from '../middlewares/validate';
import { updateAcademicYearSchema } from '../schemas/academicYear.schema';
import { createClassSchema } from '../schemas/class.schema';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);

// GET /api/academic-years/:academicYearId/classes (BRANCH_ADMIN, CORPORATE_ADMIN, TEACHER)
router.get(
  '/:academicYearId/classes',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN, UserRole.TEACHER]),
  ClassController.getClassesForAcademicYear
);

// POST /api/academic-years/:academicYearId/classes (BRANCH_ADMIN, CORPORATE_ADMIN)
router.post(
  '/:academicYearId/classes',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(createClassSchema),
  ClassController.createClass
);

// PUT /api/academic-years/:id (BRANCH_ADMIN, CORPORATE_ADMIN)
router.put(
  '/:id',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(updateAcademicYearSchema),
  AcademicYearController.updateAcademicYear
);

// DELETE /api/academic-years/:id (BRANCH_ADMIN, CORPORATE_ADMIN)
router.delete(
  '/:id',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  AcademicYearController.deleteAcademicYear
);

export default router;
