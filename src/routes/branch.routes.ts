import { Router } from 'express';
import { BranchController } from '../controllers/branch.controller';
import { AcademicYearController } from '../controllers/academicYear.controller';
import { validate } from '../middlewares/validate';
import { createBranchSchema, searchBranchSchema } from '../schemas/branch.schema';
import { createAcademicYearSchema } from '../schemas/academicYear.schema';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);

// Academic year endpoints under branch (allow BRANCH_ADMIN and CORPORATE_ADMIN)
router.get(
  '/:branchId/academic-years',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  AcademicYearController.getAcademicYears
);

router.post(
  '/:branchId/academic-years',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(createAcademicYearSchema),
  AcademicYearController.createAcademicYear
);

// Corporate Admin-only branch routes
router.use(requireRole([UserRole.CORPORATE_ADMIN]));

// POST /api/branch/create
router.post('/create', validate(createBranchSchema), BranchController.createBranch);

// GET /api/branch/corporate/all
router.get('/corporate/all', BranchController.getAllBranches);

// GET /api/branch/corporate/search
router.get('/corporate/search', validate(searchBranchSchema), BranchController.searchBranches);

// GET /api/branch/:branchId/admins
router.get('/:branchId/admins', BranchController.getAdminsForBranch);

// DELETE /api/branch/:branchId/admins/:adminId
router.delete('/:branchId/admins/:adminId', BranchController.removeAdminFromBranch);

// GET /api/branch/:branchId/teachers
router.get('/:branchId/teachers', BranchController.getTeachersForBranch);

export default router;
