import { Router } from 'express';
import { BranchController } from '../controllers/branch.controller';
import { AcademicYearController } from '../controllers/academicYear.controller';
import { SubjectController } from '../controllers/subject.controller';
import { validate } from '../middlewares/validate';
import { createBranchSchema, searchBranchSchema } from '../schemas/branch.schema';
import { createAcademicYearSchema } from '../schemas/academicYear.schema';
import { createSubjectSchema } from '../schemas/subject.schema';
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

// Subject catalog endpoints under branch (allow BRANCH_ADMIN, TEACHER, and CORPORATE_ADMIN for read; BRANCH_ADMIN, CORPORATE_ADMIN for create)
router.get(
  '/:branchId/subjects',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CORPORATE_ADMIN]),
  SubjectController.getBranchSubjects
);

router.post(
  '/:branchId/subjects',
  requireRole([UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(createSubjectSchema),
  SubjectController.createBranchSubject
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
