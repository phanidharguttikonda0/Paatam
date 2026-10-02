import { Router } from 'express';
import { CorporateController } from '../controllers/corporate.controller';
import { validate } from '../middlewares/validate';
import { createCorporateSchema } from '../schemas/corporate.schema';

const router = Router();

// POST /api/corporate/create
router.post('/create', validate(createCorporateSchema), CorporateController.createCorporate);

// POST /api/corporate/addAdmin/:corporateId
router.post('/addAdmin/:corporateId', CorporateController.addAdmin);

export default router;
