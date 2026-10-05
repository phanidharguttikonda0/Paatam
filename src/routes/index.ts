import { Router } from 'express';
import corporateRoutes from './corporate.routes';
import authRoutes from './auth.routes';
import branchRoutes from './branch.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/corporate', corporateRoutes);
router.use('/branch', branchRoutes);
router.use('/admin', adminRoutes);

export default router;
