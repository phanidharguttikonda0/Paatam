import { Router } from 'express';
import corporateRoutes from './corporate.routes';

const router = Router();

router.use('/corporate', corporateRoutes);

export default router;
