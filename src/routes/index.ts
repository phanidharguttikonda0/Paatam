import { Router } from 'express';
import corporateRoutes from './corporate.routes';
import authRoutes from './auth.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/corporate', corporateRoutes);

export default router;
