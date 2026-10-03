import { Router } from 'express';
import { CorporateController } from '../controllers/corporate.controller';
import { validate } from '../middlewares/validate';
import { createCorporateSchema } from '../schemas/corporate.schema';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/corporate/create
router.post('/create', validate(createCorporateSchema), CorporateController.createCorporate);

// POST /api/corporate/addAdmin/:corporateId
router.post('/addAdmin/:corporateId', requireAuth, CorporateController.addAdmin);

export default router;
