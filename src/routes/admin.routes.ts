import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { validate } from '../middlewares/validate';
import { createAdminSchema, updateAdminSchema, assignBranchesSchema } from '../schemas/admin.schema';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);
router.use(requireRole([UserRole.CORPORATE_ADMIN]));

// POST /api/admin/create
router.post('/create', validate(createAdminSchema), AdminController.createAdmin);

// POST /api/admin/:adminId/assign-branches
router.post('/:adminId/assign-branches', validate(assignBranchesSchema), AdminController.assignBranches);

// PUT /api/admin/:adminId
router.put('/:adminId', validate(updateAdminSchema), AdminController.updateAdmin);

// DELETE /api/admin/:adminId
router.delete('/:adminId', AdminController.deleteAdmin);

// GET /api/admin/corporate/all
router.get('/corporate/all', AdminController.getAdminsForCorporate);

// GET /api/admin/:adminId/branches
router.get('/:adminId/branches', AdminController.getAdminBranches);

export default router;
