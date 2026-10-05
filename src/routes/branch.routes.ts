import { Router } from 'express';
import { BranchController } from '../controllers/branch.controller';
import { validate } from '../middlewares/validate';
import { createBranchSchema } from '../schemas/branch.schema';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);
router.use(requireRole([UserRole.CORPORATE_ADMIN]));

// POST /api/branch/create
router.post('/create', validate(createBranchSchema), BranchController.createBranch);

// GET /api/branch/:branchId/admins
router.get('/:branchId/admins', BranchController.getAdminsForBranch);

export default router;
