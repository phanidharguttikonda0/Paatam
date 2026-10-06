import { Router } from 'express';
import { CorporateController } from '../controllers/corporate.controller';
import { validate } from '../middlewares/validate';
import { createCorporateSchema } from '../schemas/corporate.schema';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

// GET /api/corporate/lookup/:registrationNo
router.get('/lookup/:registrationNo', CorporateController.lookupByRegistrationNo);

// POST /api/corporate/create
router.post('/create', validate(createCorporateSchema), CorporateController.createCorporate);

// POST /api/corporate/addAdmin/:corporateId
router.post('/addAdmin/:corporateId', requireAuth, requireRole([UserRole.CORPORATE_ADMIN]), CorporateController.addAdmin);

// GET /api/corporate/admins/all
router.get('/admins/all', requireAuth, requireRole([UserRole.CORPORATE_ADMIN]), CorporateController.getCorporateAdmins);

// GET /api/corporate/admin-profile/:adminId
router.get('/admin-profile/:adminId', requireAuth, requireRole([UserRole.CORPORATE_ADMIN]), CorporateController.getCorporateAdminProfile);

export default router;
