import { Router } from 'express';
import { BranchAdminController } from '../controllers/branchAdmin.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);
router.use(requireRole([UserRole.BRANCH_ADMIN]));

// GET /api/branch-admin/my-branches
router.get('/my-branches', BranchAdminController.getMyBranches);

// GET /api/branch-admin/profile
router.get('/profile', BranchAdminController.getProfile);

export default router;
